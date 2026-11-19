package com.shrambazar.service.job;

import com.shrambazar.dto.job.ShowcaseJobResponse;
import com.shrambazar.entity.ShowcaseJob;
import com.shrambazar.repository.ShowcaseJobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PushbackReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ShowcaseJobService {
    private static final Pattern SPACE = Pattern.compile("\\s+");
    private static final Map<String, MapArea> AREAS = createMapAreas();
    private final ShowcaseJobRepository repository;

    public ShowcaseJobService(ShowcaseJobRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ShowcaseJobResponse> search(String keyword, String location, String category,
                                            String jobType, BigDecimal minSalary,
                                            BigDecimal maxSalary, String source) {
        String q = clean(keyword);
        String place = clean(location);
        String cat = clean(category);
        String type = clean(jobType);
        String src = clean(source);
        return repository.findAllByOrderByPostedDateDescTitleAsc().stream()
                .filter(job -> containsAny(q, job.getTitle(), job.getCompany(), job.getCategory(), job.getLocation(), job.getExperience(), job.getSkillsRaw(), job.getJobTypeRaw(), job.getJobLevel()))
                .filter(job -> place == null || contains(job.getNormalizedLocation(), normalize(place)) || contains(job.getLocation(), place))
                .filter(job -> contains(job.getCategory(), cat))
                .filter(job -> contains(job.getJobTypeRaw(), type))
                .filter(job -> src == null || src.equalsIgnoreCase(job.getSource()))
                .filter(job -> matchesSalary(job, minSalary, maxSalary))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ImportResult importCsv(Path csvPath) throws IOException {
        try (var reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            return importCsvReader(reader);
        }
    }

    @Transactional
    public ImportResult importCsv(InputStream csvStream) throws IOException {
        try (var reader = new InputStreamReader(csvStream, StandardCharsets.UTF_8)) {
            return importCsvReader(reader);
        }
    }

    private ImportResult importCsvReader(java.io.Reader reader) throws IOException {
        List<List<String>> records = parseCsv(reader);
        if (records.isEmpty()) throw new IOException("The CSV file is empty.");

        List<String> headers = records.get(0).stream().map(String::trim).toList();
        if (!headers.containsAll(List.of("title", "company", "location", "source"))) {
            throw new IOException("CSV must include title, company, location, and source columns.");
        }
        Set<String> known = repository.findAll().stream().map(ShowcaseJob::getFingerprint).collect(Collectors.toSet());
        int added = 0;
        int duplicate = 0;
        int excluded = 0;
        int invalid = 0;
        for (int i = 1; i < records.size(); i++) {
            List<String> cells = records.get(i);
            if (cells.stream().allMatch(String::isBlank)) continue;
            Map<String, String> row = new HashMap<>();
            for (int c = 0; c < headers.size() && c < cells.size(); c++) row.put(headers.get(c), clean(cells.get(c)));
            String title = row.get("title");
            if (title == null || row.get("source") == null) { invalid++; continue; }
            if (isNonEmploymentListing(title, row.get("category"))) { excluded++; continue; }

            String fingerprint = fingerprint(row);
            if (!known.add(fingerprint)) { duplicate++; continue; }
            repository.save(toEntity(row, fingerprint));
            added++;
        }
        return new ImportResult(records.size() - 1, added, duplicate, excluded, invalid);
    }

    public static boolean isNonEmploymentListing(String title, String category) {
        String t = normalize(title);
        String c = normalize(category);
        if (c.contains("tender notice") || c.contains("expression of interest") || c.contains("expressions of interest")) return true;
        return t.contains("tender notice") || t.contains("invitation for bid") || t.contains("invitation to bid")
                || t.contains("call for bid") || t.contains("request for quotation") || t.contains("quotation notice")
                || t.contains("request for proposal") || t.contains("consultant proposal") || t.contains("rfp notice")
                || t.equals("rfp") || t.equals("rfq") || t.equals("rfi") || t.equals("eoi")
                || t.contains("expression of interest") || t.contains("call for collaboration and registration")
                || t.contains("bolpatra") || t.contains("बोलपत्र") || t.contains("कोटेशन");
    }

    private ShowcaseJob toEntity(Map<String, String> row, String fingerprint) {
        ShowcaseJob job = new ShowcaseJob();
        job.setFingerprint(fingerprint);
        job.setTitle(limit(row.get("title"), 500));
        job.setCompany(limit(row.get("company"), 300));
        job.setLocation(limit(row.get("location"), 500));
        job.setNormalizedLocation(row.get("location") == null ? null : normalize(row.get("location")));
        job.setCountry(limit(row.get("country"), 100));
        job.setSalaryText(limit(row.get("salary_str"), 300));
        job.setSalaryMin(decimal(row.get("salary_min")));
        job.setSalaryMax(decimal(row.get("salary_max")));
        job.setSalaryCurrency(limit(row.get("salary_currency"), 20));
        job.setCategory(limit(row.get("category"), 500));
        job.setDeadline(date(row.get("deadline")));
        job.setExperience(limit(row.get("experience"), 300));
        job.setSkillsRaw(row.get("skills"));
        job.setJobLevel(limit(row.get("job_level"), 100));
        job.setJobTypeRaw(limit(row.get("job_type"), 300));
        job.setVacancies(integer(row.get("vacancies")));
        job.setPostedDate(date(row.get("posted_date")));
        job.setSource(limit(row.get("source"), 40));
        job.setTitleSkillsRaw(row.get("title_skills"));
        job.setScrapedAt(date(row.get("scraped_at")));
        job.setSourceUrl(firstNonEmpty(row.get("source_url"), row.get("url"), row.get("job_url"), row.get("application_url")));
        MapArea area = findArea(row.get("location"));
        if (area != null) {
            job.setMapArea(area.name());
            job.setMapLatitude(area.latitude());
            job.setMapLongitude(area.longitude());
        }
        return job;
    }

    private ShowcaseJobResponse toResponse(ShowcaseJob job) {
        return new ShowcaseJobResponse(job.getId(), job.getTitle(), job.getCompany(), job.getLocation(), job.getCountry(),
                job.getSalaryText(), job.getSalaryMin(), job.getSalaryMax(), job.getSalaryCurrency(), job.getCategory(),
                job.getDeadline(), job.getExperience(), parseList(job.getSkillsRaw()), job.getJobLevel(), parseList(job.getJobTypeRaw()),
                job.getVacancies(), job.getPostedDate(), job.getSource(), job.getSourceUrl(), job.getScrapedAt(),
                "UNVERIFIED_HISTORICAL", job.getMapArea(), job.getMapLatitude(), job.getMapLongitude());
    }

    private static boolean matchesSalary(ShowcaseJob job, BigDecimal min, BigDecimal max) {
        BigDecimal low = job.getSalaryMin() != null ? job.getSalaryMin() : job.getSalaryMax();
        BigDecimal high = job.getSalaryMax() != null ? job.getSalaryMax() : job.getSalaryMin();
        if ((min != null || max != null) && low == null && high == null) return false;
        return (min == null || high.compareTo(min) >= 0) && (max == null || low.compareTo(max) <= 0);
    }

    private static boolean containsAny(String query, String... fields) {
        if (query == null) return true;
        return Arrays.stream(fields).anyMatch(value -> contains(value, query));
    }

    private static boolean contains(String value, String query) {
        return query == null || (value != null && normalize(value).contains(normalize(query)));
    }

    static String fingerprint(Map<String, String> row) {
        String identity = String.join("|", normalize(row.get("source")), normalize(row.get("title")),
                normalize(row.get("company")), normalize(row.get("location")), normalize(row.get("posted_date")));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(identity.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    static List<String> parseList(String raw) {
        if (raw == null || raw.isBlank() || raw.trim().equals("[]")) return List.of();
        String value = raw.trim();
        if (value.startsWith("[") && value.endsWith("]")) value = value.substring(1, value.length() - 1);
        List<String> items = new ArrayList<>();
        for (String item : value.split("\\s*,\\s*(?=(?:[^\\\"]*\\\"[^\\\"]*\\\")*[^\\\"]*$)")) {
            String clean = item.trim().replaceAll("^[\\\"']|[\\\"']$", "").trim();
            if (!clean.isBlank() && !items.contains(clean)) items.add(clean);
        }
        return items;
    }

    static List<List<String>> parseCsv(java.io.Reader source) throws IOException {
        PushbackReader reader = new PushbackReader(source, 1);
        List<List<String>> records = new ArrayList<>();
        List<String> record = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;
        int code;
        while ((code = reader.read()) != -1) {
            char ch = (char) code;
            if (quoted) {
                if (ch == '"') {
                    int next = reader.read();
                    if (next == '"') field.append('"');
                    else { quoted = false; if (next != -1) reader.unread(next); }
                } else field.append(ch);
            } else if (ch == '"' && field.isEmpty()) quoted = true;
            else if (ch == ',') { record.add(field.toString()); field.setLength(0); }
            else if (ch == '\n' || ch == '\r') {
                if (ch == '\r') { int next = reader.read(); if (next != '\n' && next != -1) reader.unread(next); }
                record.add(field.toString()); field.setLength(0);
                records.add(record); record = new ArrayList<>();
            } else field.append(ch);
        }
        if (quoted) throw new IOException("CSV contains an unclosed quoted field.");
        if (!record.isEmpty() || !field.isEmpty()) { record.add(field.toString()); records.add(record); }
        if (!records.isEmpty() && records.getFirst().getFirst().startsWith("\uFEFF"))
            records.getFirst().set(0, records.getFirst().getFirst().substring(1));
        return records;
    }

    private static String normalize(String value) {
        if (value == null) return "";
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return SPACE.matcher(decomposed.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ")).replaceAll(" ").trim();
    }

    private static String clean(String value) {
        if (value == null) return null;
        String result = value.trim();
        return result.isEmpty() || Set.of("null", "none", "nan", "n/a").contains(result.toLowerCase(Locale.ROOT)) ? null : result;
    }

    private static BigDecimal decimal(String value) {
        String cleaned = clean(value);
        if (cleaned == null) return null;
        try { return new BigDecimal(cleaned.replace(",", "")); } catch (NumberFormatException ignored) { return null; }
    }

    private static Integer integer(String value) {
        String cleaned = clean(value);
        if (cleaned == null) return null;
        try { return Integer.valueOf(cleaned); } catch (NumberFormatException ignored) { return null; }
    }

    private static LocalDate date(String value) {
        String cleaned = clean(value);
        if (cleaned == null) return null;
        try { return LocalDate.parse(cleaned.substring(0, Math.min(10, cleaned.length()))); } catch (RuntimeException ignored) { return null; }
    }

    private static String firstNonEmpty(String... values) {
        return Arrays.stream(values).map(ShowcaseJobService::clean).filter(Objects::nonNull).findFirst().orElse(null);
    }

    private static String limit(String value, int max) { return value != null && value.length() > max ? value.substring(0, max) : value; }

    private static MapArea findArea(String rawLocation) {
        String value = normalize(rawLocation);
        if (value.isBlank()) return null;
        for (Map.Entry<String, MapArea> entry : AREAS.entrySet()) {
            if (entry.getValue().aliases().stream().anyMatch(alias -> value.contains(normalize(alias)))) return entry.getValue();
        }
        return null;
    }

    private static Map<String, MapArea> createMapAreas() {
        Map<String, MapArea> map = new LinkedHashMap<>();
        addArea(map, "Kathmandu", 27.7172, 85.3240, "kathmandu", "kathmandu valley", "new baneshwor", "sinamangal", "thamel", "naxal", "koteshwor", "chabahil", "tripureshwor", "baneshwor", "boudha", "baluwatar", "pepsicola", "basundhara", "kalanki", "kirtipur", "tokha");
        addArea(map, "Lalitpur", 27.6588, 85.3247, "lalitpur", "jawalakhel", "patan", "kupondole", "lagankhel", "sanepa", "kumaripati", "lubhu", "sunakothi", "bagdole");
        addArea(map, "Bhaktapur", 27.6710, 85.4298, "bhaktapur", "suryabinayak", "thimi", "byasi");
        addArea(map, "Bara", 27.0270, 85.0000, "bara", "kalaiya", "simara");
        addArea(map, "Dhading", 27.8667, 84.9167, "dhading");
        addArea(map, "Nuwakot", 27.9167, 85.1667, "nuwakot");
        addArea(map, "Rautahat", 26.9500, 85.2500, "rautahat", "gaur");
        addArea(map, "Rasuwa", 28.1500, 85.3000, "rasuwa", "syabrubesi");
        addArea(map, "Mugu", 29.5000, 82.1000, "mugu");
        addArea(map, "Sindhuli", 27.2500, 85.9500, "sindhuli");
        addArea(map, "Kaski", 28.2096, 83.9856, "kaski", "pokhara");
        addArea(map, "Rukum West", 28.6333, 82.4667, "rukum west", "rukum");
        addArea(map, "Sarlahi", 26.9667, 85.5667, "sarlahi");
        addArea(map, "Jajarkot", 28.7000, 82.2000, "jajarkot");
        addArea(map, "Kailali", 28.7000, 80.6000, "kailali", "dhangadhi");
        addArea(map, "Mahottari", 26.9000, 85.8000, "mahottari");
        addArea(map, "Saptari", 26.6000, 86.7500, "saptari", "rajbiraj");
        addArea(map, "Surkhet", 28.6000, 81.6000, "surkhet", "birendranagar");
        addArea(map, "Dhanusha", 26.7288, 85.9263, "dhanusha", "janakpur");
        addArea(map, "Morang", 26.6588, 87.3111, "morang", "biratnagar");
        addArea(map, "Sunsari", 26.6280, 87.1470, "sunsari", "dharan", "itahari");
        addArea(map, "Chitwan", 27.5291, 84.3542, "chitwan", "bharatpur");
        addArea(map, "Rupandehi", 27.5000, 83.4500, "rupandehi", "butwal", "bhairahawa");
        addArea(map, "Banke", 28.0500, 81.6100, "banke", "nepalgunj");
        addArea(map, "Parsa", 27.0000, 84.8700, "parsa", "birgunj");
        addArea(map, "Makwanpur", 27.4167, 85.0333, "makwanpur", "hetauda");
        addArea(map, "Jhapa", 26.6500, 87.9000, "jhapa", "birtamod", "damak");
        addArea(map, "Dang", 28.0500, 82.4833, "dang", "ghorahi", "tulsipur");
        addArea(map, "Kavrepalanchok", 27.5333, 85.5667, "kavre", "kavrepalanchok", "banepa", "dhulikhel");
        return map;
    }

    private static void addArea(Map<String, MapArea> map, String name, double latitude, double longitude, String... aliases) {
        map.put(name, new MapArea(name, latitude, longitude, List.of(aliases)));
    }

    public record ImportResult(int recordsRead, int inserted, int duplicatesSkipped, int nonEmploymentExcluded, int invalidSkipped) {}
    private record MapArea(String name, double latitude, double longitude, List<String> aliases) {}
}
