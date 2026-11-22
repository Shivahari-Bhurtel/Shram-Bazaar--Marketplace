package com.shrambazar.service.dashboard;

import com.shrambazar.dto.dashboard.ProviderAiCandidate;
import com.shrambazar.dto.dashboard.ProviderAiMatchRequest;
import com.shrambazar.dto.dashboard.ProviderAiMatchResponse;
import com.shrambazar.dto.dashboard.WorkerSearchRequest;
import com.shrambazar.dto.dashboard.WorkerSearchResponse;
import com.shrambazar.dto.job.JobPostResponse;
import com.shrambazar.service.job.JobPostService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.time.temporal.TemporalAdjusters;

@Service
public class ProviderAiService {
    private static final List<List<String>> SKILL_GROUPS = List.of(
            List.of("electrician", "electrical", "wiring", "electric", "maintenance", "repair"),
            List.of("plumber", "plumbing", "pipe fitting", "pipe installation", "water fitting"),
            List.of("painter", "painting", "wall paint", "surface preparation"),
            List.of("mason", "masonry", "bricklayer", "construction", "laborer", "labourer"),
            List.of("carpenter", "carpentry", "woodwork", "furniture"),
            List.of("welder", "welding", "metal fabrication"),
            List.of("cook", "cooking", "chef", "kitchen"),
            List.of("driver", "driving", "rider", "delivery")
    );
    private static final List<String> LOCATIONS = List.of(
            "kathmandu", "lalitpur", "bhaktapur", "pokhara", "biratnagar", "birgunj",
            "dharan", "butwal", "hetauda", "bharatpur", "dhangadhi", "nepalgunj"
    );
    private static final Pattern MIN_EXPERIENCE = Pattern.compile("(?:at least|more than|over|minimum)?\\s*(\\d+)\\s*(?:years?|yrs?)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern MAX_RATE = Pattern.compile("(?:under|below|less than|maximum|max|within|budget(?: of)?)\\s*(?:npr|rs\\.?|रु\\.?\\s*)?\\s*([\\d,]+)", Pattern.CASE_INSENSITIVE);

    private final JobPostService jobPostService;
    private final WorkerSearchService workerSearchService;

    public ProviderAiService(JobPostService jobPostService, WorkerSearchService workerSearchService) {
        this.jobPostService = jobPostService;
        this.workerSearchService = workerSearchService;
    }

    public ProviderAiMatchResponse match(ProviderAiMatchRequest request) {
        List<JobPostResponse> jobs = jobPostService.getMyJobs();
        String conversation = String.join(" ", request.history() == null ? List.of() : request.history());
        String query = (conversation + " " + request.message()).toLowerCase(Locale.ROOT);
        JobPostResponse selected = selectJob(jobs, request.jobId(), query);
        boolean needsSelection = selected == null && request.jobId() == null
                && mentionsOwnedJob(query, jobs) && jobs.stream().filter(job -> isOpen(job)).count() > 1;
        if (needsSelection) return new ProviderAiMatchResponse(jobs, null, true, List.of());
        if (!isWorkerSearch(query)) return new ProviderAiMatchResponse(jobs, selected, false, List.of());

        String criteria = query;
        if (selected != null) {
            criteria += " " + selected.title() + " " + nullToEmpty(selected.category()) + " "
                    + String.join(" ", selected.requiredSkills() == null ? List.of() : selected.requiredSkills()) + " "
                    + nullToEmpty(selected.description()) + " " + nullToEmpty(selected.qualificationRequired());
        }
        List<List<String>> skills = detectedSkillGroups(criteria);
        String location = detectLocation(query + " " + (selected == null ? "" : nullToEmpty(selected.district())));
        Double minimumExperience = parseMinimumExperience(query);
        BigDecimal maximumRate = parseMaximumRate(query);
        LocalDate availabilityDate = parseAvailabilityDate(query);
        String requestedRatePeriod = detectRatePeriod(query);
        String ratePeriod = requestedRatePeriod != null ? requestedRatePeriod
                : selected != null && selected.paymentPeriod() != null ? selected.paymentPeriod().name() : null;
        BigDecimal jobBudget = selected == null ? null
                : selected.paymentMaxAmount() != null ? selected.paymentMaxAmount() : selected.paymentAmount();
        if (jobBudget != null && (maximumRate == null || jobBudget.compareTo(maximumRate) < 0)) {
            maximumRate = jobBudget;
        }
        if (selected != null && selected.requiredExperienceMonths() != null && selected.requiredExperienceMonths() > 0) {
            minimumExperience = Math.max(minimumExperience == null ? 0 : minimumExperience,
                    selected.requiredExperienceMonths() / 12.0);
        }

        WorkerSearchRequest workerRequest = new WorkerSearchRequest();
        workerRequest.setLocation(location);
        if (minimumExperience != null) workerRequest.setMinExperienceYears((int) Math.ceil(minimumExperience));
        List<WorkerSearchResponse> workers = workerSearchService.searchWorkers(workerRequest);
        String finalLocation = location;
        Double finalMinimumExperience = minimumExperience;
        BigDecimal finalMaximumRate = maximumRate;
        List<ProviderAiCandidate> candidates = workers.stream()
                .map(worker -> score(worker, skills, finalLocation, finalMinimumExperience, finalMaximumRate, ratePeriod, availabilityDate))
                .filter(candidate -> withinRate(candidate.worker(), finalMaximumRate, ratePeriod))
                .filter(candidate -> availabilityDate == null || !hasAvailabilityData(candidate.worker())
                        || availableOnDate(candidate.worker(), availabilityDate))
                .filter(candidate -> candidate.matchScore() == null || candidate.matchScore() >= 25)
                .sorted(Comparator
                        .comparing(ProviderAiCandidate::matchScore, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(candidate -> candidate.worker().getAverageRating(), Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(candidate -> candidate.worker().getFullName(), String.CASE_INSENSITIVE_ORDER))
                .limit(6)
                .toList();
        return new ProviderAiMatchResponse(jobs, selected, false, candidates);
    }

    private JobPostResponse selectJob(List<JobPostResponse> jobs, Long requestedId, String query) {
        if (requestedId != null) return jobs.stream().filter(job -> requestedId.equals(job.id())).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "That job is not in your provider account."));
        List<JobPostResponse> titleMatches = jobs.stream()
                .filter(job -> job.title() != null && query.contains(job.title().toLowerCase(Locale.ROOT)))
                .toList();
        if (titleMatches.size() == 1) return titleMatches.getFirst();
        boolean latest = query.contains("latest") || query.contains("most recent") || query.contains("last posted");
        if (latest) return jobs.stream().filter(this::isOpen).findFirst().orElse(jobs.isEmpty() ? null : jobs.getFirst());
        long openJobs = jobs.stream().filter(this::isOpen).count();
        if (openJobs == 1 && (query.contains("my job") || query.contains("my posted") || query.contains("for this job")))
            return jobs.stream().filter(this::isOpen).findFirst().orElse(null);
        return null;
    }

    private boolean mentionsOwnedJob(String query, List<JobPostResponse> jobs) {
        return query.contains("my job") || query.contains("my posted") || jobs.stream()
                .anyMatch(job -> job.title() != null && query.contains(job.title().toLowerCase(Locale.ROOT)));
    }

    private boolean isWorkerSearch(String query) {
        return query.matches("(?s).*(\\b(find|search|show|list|compare|match|recommend|hire|candidate|candidates|worker|workers|staff|people|available)\\b|electrician|plumb|painter|mason|carpenter|weld|driver|cook|cleaner).*" )
                || query.contains("for my job") || query.contains("for my latest");
    }

    private boolean isOpen(JobPostResponse job) {
        return job.status() != null && (job.status().name().equals("OPEN") || job.status().name().equals("ASSIGNED"));
    }

    private ProviderAiCandidate score(WorkerSearchResponse worker, List<List<String>> requiredSkills, String location,
                                      Double minimumExperience, BigDecimal maximumRate, String ratePeriod, LocalDate availabilityDate) {
        List<String> reasons = new ArrayList<>();
        double weightedScore = 0;
        double knownWeight = 0;
        String profile = (String.join(" ", worker.getSkills() == null ? List.of() : worker.getSkills()) + " "
                + String.join(" ", worker.getWorkExperiences() == null ? List.of() : worker.getWorkExperiences()) + " "
                + (worker.getServices() == null ? "" : worker.getServices().stream()
                .map(service -> nullToEmpty(service.category()) + " " + nullToEmpty(service.title()) + " " + nullToEmpty(service.description()))
                .reduce("", (left, right) -> left + " " + right))).toLowerCase(Locale.ROOT);

        if (!requiredSkills.isEmpty()) {
            List<String> matches = requiredSkills.stream()
                    .filter(group -> group.stream().anyMatch(profile::contains))
                    .map(group -> group.getFirst()).toList();
            weightedScore += 40.0 * matches.size() / requiredSkills.size();
            knownWeight += 40;
            if (!matches.isEmpty()) reasons.add("Related skills or service: " + String.join(", ", matches));
        }
        if (location != null) {
            knownWeight += 20;
            boolean fits = nullToEmpty(worker.getAddress()).toLowerCase(Locale.ROOT).contains(location);
            if (fits) weightedScore += 20;
            if (fits) reasons.add("Located in " + titleCase(location));
        }
        if (minimumExperience != null) {
            if (worker.getTotalExperienceYears() != null) {
                knownWeight += 15;
                if (worker.getTotalExperienceYears() >= minimumExperience) {
                    weightedScore += 15;
                    reasons.add("Experience meets the stated " + minimumExperience + "+ year requirement");
                }
            }
        }
        if (maximumRate != null && worker.getServices() != null) {
            BigDecimal rate = rateFor(worker, ratePeriod);
            if (rate != null) {
                knownWeight += 10;
                if (rate.compareTo(maximumRate) <= 0) {
                    weightedScore += 10;
                    reasons.add("Published service rate is within the stated budget");
                }
            }
        }
        if (availabilityDate != null && hasAvailabilityData(worker)) {
            knownWeight += 15;
            if (availableOnDate(worker, availabilityDate)) {
                weightedScore += 15;
                reasons.add("Published availability includes " + availabilityDate);
            }
        }
        Integer matchScore = knownWeight == 0 ? null : (int) Math.round(weightedScore / knownWeight * 100);
        if (reasons.isEmpty() && matchScore != null) reasons.add("Profile details are available for comparison");
        return new ProviderAiCandidate(worker, matchScore, reasons);
    }

    private boolean withinRate(WorkerSearchResponse worker, BigDecimal maximumRate, String ratePeriod) {
        if (maximumRate == null) return true;
        BigDecimal rate = rateFor(worker, ratePeriod);
        return rate == null || rate.compareTo(maximumRate) <= 0;
    }

    private BigDecimal rateFor(WorkerSearchResponse worker, String ratePeriod) {
        return worker.getServices() == null ? null : worker.getServices().stream()
                .filter(service -> ratePeriod == null || (service.pricingType() != null
                        && ratePeriod.equals(service.pricingType().name())))
                .map(service -> service.price()).filter(price -> price != null)
                .min(BigDecimal::compareTo).orElse(null);
    }

    private String detectRatePeriod(String text) {
        if (text.matches("(?s).*(?:per day|daily|a day|each day).*")) return "PER_DAY";
        if (text.matches("(?s).*(?:per hour|hourly|an hour|each hour).*")) return "PER_HOUR";
        if (text.matches("(?s).*(?:fixed rate|one-time|for the whole job).*")) return "FIXED";
        return null;
    }

    private LocalDate parseAvailabilityDate(String text) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kathmandu"));
        if (text.contains("tomorrow")) return today.plusDays(1);
        if (text.matches("(?s).*\\btoday\\b.*")) return today;
        DayOfWeek[] days = {DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY};
        String[] names = {"monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"};
        for (int index = 0; index < names.length; index++) {
            if (text.matches("(?s).*\\b" + names[index] + "\\b.*"))
                return today.with(TemporalAdjusters.nextOrSame(days[index]));
        }
        return null;
    }

    private boolean hasAvailabilityData(WorkerSearchResponse worker) {
        return worker.getServices() != null && worker.getServices().stream()
                .anyMatch(service -> service.availability() != null && service.availability().stream()
                        .anyMatch(slot -> slot.startDate() != null || slot.endDate() != null || slot.dayOfWeek() != null));
    }

    private boolean availableOnDate(WorkerSearchResponse worker, LocalDate date) {
        if (worker.getServices() == null) return false;
        return worker.getServices().stream().filter(service -> service.availability() != null)
                .flatMap(service -> service.availability().stream())
                .anyMatch(slot -> {
                    boolean hasDateRange = slot.startDate() != null || slot.endDate() != null;
                    boolean inDateRange = (slot.startDate() == null || !date.isBefore(slot.startDate()))
                            && (slot.endDate() == null || !date.isAfter(slot.endDate()));
                    boolean matchesDay = slot.dayOfWeek() == null || slot.dayOfWeek() == date.getDayOfWeek();
                    return hasDateRange ? inDateRange && matchesDay : matchesDay;
                });
    }

    private List<List<String>> detectedSkillGroups(String text) {
        List<List<String>> detected = new ArrayList<>();
        String normalized = text.toLowerCase(Locale.ROOT);
        for (List<String> group : SKILL_GROUPS)
            if (group.stream().anyMatch(normalized::contains)) detected.add(group);
        return List.copyOf(detected);
    }

    private String detectLocation(String text) {
        String normalized = text.toLowerCase(Locale.ROOT);
        return LOCATIONS.stream().filter(normalized::contains).findFirst().orElse(null);
    }

    private Double parseMinimumExperience(String text) {
        Matcher matcher = MIN_EXPERIENCE.matcher(text);
        return matcher.find() ? Double.valueOf(matcher.group(1)) : null;
    }

    private BigDecimal parseMaximumRate(String text) {
        Matcher matcher = MAX_RATE.matcher(text);
        if (!matcher.find()) return null;
        try { return new BigDecimal(matcher.group(1).replace(",", "")); }
        catch (NumberFormatException ignored) { return null; }
    }

    private String nullToEmpty(String value) { return value == null ? "" : value; }

    private String titleCase(String value) { return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1); }
}
