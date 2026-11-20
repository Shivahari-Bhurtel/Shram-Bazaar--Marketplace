package com.shrambazar.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Imported reference listing. These records are deliberately separate from provider-owned job_posts. */
@Entity
@Table(name = "showcase_jobs", uniqueConstraints = @UniqueConstraint(name = "uk_showcase_job_fingerprint", columnNames = "fingerprint"))
public class ShowcaseJob {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String fingerprint;
    @Column(unique = true, length = 64)
    private String datasetId;
    @Column(nullable = false, length = 500)
    private String title;
    @Column(length = 300)
    private String company;
    @Column(length = 500)
    private String location;
    @Column(length = 500)
    private String address;
    @Column(length = 100)
    private String city;
    @Column(length = 500)
    private String normalizedLocation;
    @Column(length = 100)
    private String country;
    @Column(length = 300)
    private String salaryText;
    @Column(precision = 14, scale = 2)
    private BigDecimal salaryMin;
    @Column(precision = 14, scale = 2)
    private BigDecimal salaryMax;
    @Column(length = 20)
    private String salaryCurrency;
    @Column(length = 500)
    private String category;
    private LocalDate deadline;
    @Column(length = 300)
    private String experience;
    @Column(columnDefinition = "TEXT")
    private String skillsRaw;
    @Column(length = 100)
    private String jobLevel;
    @Column(length = 300)
    private String jobTypeRaw;
    private Integer vacancies;
    private LocalDate postedDate;
    @Column(nullable = false, length = 40)
    private String source;
    @Column(columnDefinition = "TEXT")
    private String titleSkillsRaw;
    private LocalDate scrapedAt;
    @Column(length = 1000)
    private String sourceUrl;
    @Column(length = 100)
    private String mapArea;
    private Double mapLatitude;
    private Double mapLongitude;
    @Column(columnDefinition = "TEXT")
    private String description;
    @Column(columnDefinition = "TEXT")
    private String requirementsRaw;
    @Column(length = 20)
    private String salaryType;
    @Column(length = 100)
    private String experienceText;
    private Boolean demo;
    @Column(length = 40)
    private String locationAccuracy;

    public Long getId() { return id; }
    public String getFingerprint() { return fingerprint; }
    public void setFingerprint(String value) { this.fingerprint = value; }
    public String getDatasetId() { return datasetId; }
    public void setDatasetId(String value) { this.datasetId = value; }
    public String getTitle() { return title; }
    public void setTitle(String value) { this.title = value; }
    public String getCompany() { return company; }
    public void setCompany(String value) { this.company = value; }
    public String getLocation() { return location; }
    public void setLocation(String value) { this.location = value; }
    public String getAddress() { return address; }
    public void setAddress(String value) { this.address = value; }
    public String getCity() { return city; }
    public void setCity(String value) { this.city = value; }
    public String getNormalizedLocation() { return normalizedLocation; }
    public void setNormalizedLocation(String value) { this.normalizedLocation = value; }
    public String getCountry() { return country; }
    public void setCountry(String value) { this.country = value; }
    public String getSalaryText() { return salaryText; }
    public void setSalaryText(String value) { this.salaryText = value; }
    public BigDecimal getSalaryMin() { return salaryMin; }
    public void setSalaryMin(BigDecimal value) { this.salaryMin = value; }
    public BigDecimal getSalaryMax() { return salaryMax; }
    public void setSalaryMax(BigDecimal value) { this.salaryMax = value; }
    public String getSalaryCurrency() { return salaryCurrency; }
    public void setSalaryCurrency(String value) { this.salaryCurrency = value; }
    public String getCategory() { return category; }
    public void setCategory(String value) { this.category = value; }
    public LocalDate getDeadline() { return deadline; }
    public void setDeadline(LocalDate value) { this.deadline = value; }
    public String getExperience() { return experience; }
    public void setExperience(String value) { this.experience = value; }
    public String getSkillsRaw() { return skillsRaw; }
    public void setSkillsRaw(String value) { this.skillsRaw = value; }
    public String getJobLevel() { return jobLevel; }
    public void setJobLevel(String value) { this.jobLevel = value; }
    public String getJobTypeRaw() { return jobTypeRaw; }
    public void setJobTypeRaw(String value) { this.jobTypeRaw = value; }
    public Integer getVacancies() { return vacancies; }
    public void setVacancies(Integer value) { this.vacancies = value; }
    public LocalDate getPostedDate() { return postedDate; }
    public void setPostedDate(LocalDate value) { this.postedDate = value; }
    public String getSource() { return source; }
    public void setSource(String value) { this.source = value; }
    public String getTitleSkillsRaw() { return titleSkillsRaw; }
    public void setTitleSkillsRaw(String value) { this.titleSkillsRaw = value; }
    public LocalDate getScrapedAt() { return scrapedAt; }
    public void setScrapedAt(LocalDate value) { this.scrapedAt = value; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String value) { this.sourceUrl = value; }
    public String getMapArea() { return mapArea; }
    public void setMapArea(String value) { this.mapArea = value; }
    public Double getMapLatitude() { return mapLatitude; }
    public void setMapLatitude(Double value) { this.mapLatitude = value; }
    public Double getMapLongitude() { return mapLongitude; }
    public void setMapLongitude(Double value) { this.mapLongitude = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { this.description = value; }
    public String getRequirementsRaw() { return requirementsRaw; }
    public void setRequirementsRaw(String value) { this.requirementsRaw = value; }
    public String getSalaryType() { return salaryType; }
    public void setSalaryType(String value) { this.salaryType = value; }
    public String getExperienceText() { return experienceText; }
    public void setExperienceText(String value) { this.experienceText = value; }
    public Boolean getDemo() { return demo; }
    public void setDemo(Boolean value) { this.demo = value; }
    public String getLocationAccuracy() { return locationAccuracy; }
    public void setLocationAccuracy(String value) { this.locationAccuracy = value; }
}
