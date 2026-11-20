package com.shrambazar.service.job;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shrambazar.dto.job.ShowcaseJobResponse;
import com.shrambazar.entity.ShowcaseJob;
import com.shrambazar.repository.ShowcaseJobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class ShowcaseJobService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Pattern SPACE = Pattern.compile("\\s+");
    private static final Set<String> CATEGORIES = Set.of(
            "Construction & Skilled Trades", "Delivery & Logistics",
            "Hospitality & Service", "Retail & Sales");
    private final ShowcaseJobRepository repository;

    public ShowcaseJobService(ShowcaseJobRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ShowcaseJobResponse> search(String keyword, String location, String category,
                                            String jobType, BigDecimal minSalary,
                                            BigDecimal maxSalary, String source) {
        String query = clean(keyword);
        String place = clean(location);
        String selectedCategory = clean(category);
        String selectedType = clean(jobType);
        String selectedSource = clean(source);
        return repository.findAllByOrderByPostedDateDescTitleAsc().stream()
                .filter(job -> containsAny(query, job.getTitle(), job.getCompany(), job.getCategory(), job.getLocation(), job.getCity(), job.getAddress(), job.getDescription(), job.getExperience(), job.getSkillsRaw(), job.getRequirementsRaw(), job.getJobTypeRaw()))
                .filter(job -> place == null || contains(job.getNormalizedLocation(), normalize(place)) || contains(job.getAddress(), place))
                .filter(job -> contains(job.getCategory(), selectedCategory))
                .filter(job -> contains(job.getJobTypeRaw(), selectedType))
                .filter(job -> selectedSource == null || selectedSource.equalsIgnoreCase(job.getSource()))
                .filter(job -> matchesSalary(job, minSalary, maxSalary))
                .map(this::toResponse)
                .toList();
    }

    /** Replaces only imported showcase rows. Provider-owned job_posts are not touched. */
    @Transactional
    public ImportResult replaceWithDemoJson(InputStream jsonStream) throws IOException {
        JsonNode root = JSON.readTree(jsonStream);
        if (root == null || !root.isArray() || root.size() != 80) {
            throw new IOException("The demo jobs JSON must be an array containing exactly 80 listings.");
        }

        List<ShowcaseJob> jobs = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        Set<String> listingKeys = new HashSet<>();
        for (JsonNode item : root) {
            String id = requiredText(item, "id");
            String title = requiredText(item, "title");
            String company = requiredText(item, "company");
            String category = requiredText(item, "category");
            String location = requiredText(item, "location");
            if (!ids.add(id)) throw new IOException("Duplicate demo job id: " + id);
            if (!CATEGORIES.contains(category)) throw new IOException("Unsupported demo job category: " + category);
            String listingKey = normalize(title) + "|" + normalize(company) + "|" + normalize(location);
            if (!listingKeys.add(listingKey)) throw new IOException("Duplicate demo job listing: " + title + " at " + location);
            if (!item.path("is_demo").asBoolean(false)) throw new IOException("Every imported listing must be marked as demo data.");

            double latitude = requiredNumber(item, "latitude").doubleValue();
            double longitude = requiredNumber(item, "longitude").doubleValue();
            if (latitude < 27.5 || latitude > 27.9 || longitude < 85.1 || longitude > 85.6) {
                throw new IOException("Demo job coordinates must be within Kathmandu Valley.");
            }
            BigDecimal salaryMin = requiredNumber(item, "salary_min");
            BigDecimal salaryMax = requiredNumber(item, "salary_max");
            if (salaryMin.signum() <= 0 || salaryMin.compareTo(salaryMax) > 0) throw new IOException("Invalid salary range for demo job " + id);
            String salaryType = requiredText(item, "salary_type");
            if (!Set.of("monthly", "daily", "hourly").contains(salaryType)) throw new IOException("Invalid salary type for demo job " + id);
            int vacancies = item.path("vacancies").asInt(0);
            if (vacancies < 1) throw new IOException("Invalid vacancy count for demo job " + id);

            ShowcaseJob job = new ShowcaseJob();
            job.setDatasetId(id);
            job.setFingerprint(fingerprint(id));
            job.setTitle(limit(title, 500));
            job.setCompany(limit(company, 300));
            job.setLocation(limit(location, 500));
            String city = requiredText(item, "city");
            job.setNormalizedLocation(normalize(location + " " + city));
            job.setAddress(limit(requiredText(item, "address"), 500));
            job.setCity(limit(city, 100));
            job.setCountry("Nepal");
            job.setCategory(limit(category, 500));
            job.setDescription(requiredText(item, "description"));
            job.setSalaryMin(salaryMin);
            job.setSalaryMax(salaryMax);
            job.setSalaryCurrency("NPR");
            job.setSalaryType(salaryType);
            job.setExperience(limit(requiredText(item, "experience"), 300));
            job.setJobTypeRaw(limit(requiredText(item, "job_type"), 300));
            job.setSkillsRaw(JSON.writeValueAsString(readStringArray(item, "skills")));
            job.setRequirementsRaw(JSON.writeValueAsString(readStringArray(item, "requirements")));
            job.setVacancies(vacancies);
            job.setPostedDate(readDate(item, "posted_date"));
            job.setDeadline(readDate(item, "deadline"));
            job.setSource(limit(requiredText(item, "source"), 40));
            job.setMapArea(limit(location, 100));
            job.setMapLatitude(latitude);
            job.setMapLongitude(longitude);
            job.setDemo(true);
            job.setLocationAccuracy(limit(requiredText(item, "location_accuracy"), 40));
            if (!"approximate".equals(job.getLocationAccuracy())) throw new IOException("Demo job locations must be marked approximate.");
            jobs.add(job);
        }

        repository.deleteAllInBatch();
        repository.saveAll(jobs);
        return new ImportResult(jobs.size());
    }

    private ShowcaseJobResponse toResponse(ShowcaseJob job) {
        return new ShowcaseJobResponse(job.getDatasetId(), job.getTitle(), job.getCategory(), job.getCompany(),
                job.getDescription(), job.getLocation(), job.getAddress(), job.getCity(), job.getMapLatitude(),
                job.getMapLongitude(), job.getSalaryMin(), job.getSalaryMax(), job.getSalaryType(), job.getJobTypeRaw(),
                job.getExperience(), parseList(job.getSkillsRaw()), parseList(job.getRequirementsRaw()), job.getVacancies(),
                job.getPostedDate(), job.getDeadline(), Boolean.TRUE.equals(job.getDemo()), job.getSource(), job.getLocationAccuracy());
    }

    private static String requiredText(JsonNode item, String field) throws IOException {
        JsonNode value = item.get(field);
        if (value == null || !value.isTextual() || value.asText().isBlank()) throw new IOException("Missing required text field: " + field);
        return value.asText().trim();
    }

    private static BigDecimal requiredNumber(JsonNode item, String field) throws IOException {
        JsonNode value = item.get(field);
        if (value == null || !value.isNumber()) throw new IOException("Missing or invalid numeric field: " + field);
        return value.decimalValue();
    }

    private static LocalDate readDate(JsonNode item, String field) throws IOException {
        try {
            return LocalDate.parse(requiredText(item, field));
        } catch (DateTimeParseException exception) {
            throw new IOException("Invalid ISO date in field " + field, exception);
        }
    }

    private static List<String> readStringArray(JsonNode item, String field) throws IOException {
        JsonNode value = item.get(field);
        if (value == null || !value.isArray()) throw new IOException("Missing or invalid array field: " + field);
        List<String> result = new ArrayList<>();
        for (JsonNode entry : value) {
            if (!entry.isTextual() || entry.asText().isBlank()) throw new IOException("Invalid item in " + field);
            result.add(entry.asText());
        }
        return result;
    }

    private static boolean matchesSalary(ShowcaseJob job, BigDecimal min, BigDecimal max) {
        BigDecimal low = job.getSalaryMin() != null ? job.getSalaryMin() : job.getSalaryMax();
        BigDecimal high = job.getSalaryMax() != null ? job.getSalaryMax() : job.getSalaryMin();
        if ((min != null || max != null) && low == null && high == null) return false;
        return (min == null || high.compareTo(min) >= 0) && (max == null || low.compareTo(max) <= 0);
    }

    private static boolean containsAny(String query, String... fields) {
        return query == null || Arrays.stream(fields).anyMatch(value -> contains(value, query));
    }

    private static boolean contains(String value, String query) {
        return query == null || (value != null && normalize(value).contains(normalize(query)));
    }

    private static String fingerprint(String id) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(id.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static List<String> parseList(String value) {
        if (value == null || value.isBlank()) return List.of();
        try {
            JsonNode array = JSON.readTree(value);
            if (array != null && array.isArray()) {
                List<String> items = new ArrayList<>();
                array.forEach(item -> { if (item.isTextual()) items.add(item.asText()); });
                return items;
            }
        } catch (IOException ignored) {
            // A malformed imported list should not prevent other job fields from loading.
        }
        return List.of();
    }

    private static String normalize(String value) {
        if (value == null) return "";
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return SPACE.matcher(decomposed.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ")).replaceAll(" ").trim();
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String limit(String value, int max) {
        return value != null && value.length() > max ? value.substring(0, max) : value;
    }

    public record ImportResult(int recordsRead) {}
}
