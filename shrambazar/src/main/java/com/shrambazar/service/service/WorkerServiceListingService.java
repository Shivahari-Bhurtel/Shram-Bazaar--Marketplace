package com.shrambazar.service.service;

import com.shrambazar.dto.service.*;
import com.shrambazar.entity.SeekerProfile;
import com.shrambazar.entity.WorkerServiceListing;
import com.shrambazar.entity.Availability;
import com.shrambazar.repository.AvailabilityRepository;
import com.shrambazar.repository.WorkerServiceListingRepository;
import com.shrambazar.service.CurrentUserService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Arrays;
import java.util.List;

@Service
public class WorkerServiceListingService {
    private final WorkerServiceListingRepository repository;
    private final AvailabilityRepository availabilityRepository;
    private final CurrentUserService currentUserService;

    public WorkerServiceListingService(WorkerServiceListingRepository repository, AvailabilityRepository availabilityRepository, CurrentUserService currentUserService) {
        this.repository = repository;
        this.availabilityRepository = availabilityRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<WorkerServiceResponse> getMine() {
        SeekerProfile seeker = currentUserService.getCurrentSeekerProfile();
        return repository.findBySeekerProfileIdOrderByUpdatedAtDesc(seeker.getId()).stream().map(this::map).toList();
    }

    @Transactional
    public WorkerServiceResponse create(WorkerServiceRequest request) {
        SeekerProfile seeker = currentUserService.getCurrentSeekerProfile();
        WorkerServiceListing existing = repository.findFirstBySeekerProfileIdAndCategoryIgnoreCaseAndTitleIgnoreCase(
                seeker.getId(), request.category().trim(), request.title().trim()).orElse(null);
        if (existing != null) {
            apply(existing, request);
            return map(repository.save(existing));
        }
        WorkerServiceListing listing = new WorkerServiceListing();
        listing.setSeekerProfile(seeker);
        apply(listing, request);
        return map(repository.save(listing));
    }

    @Transactional
    public WorkerServiceResponse update(Long id, WorkerServiceRequest request) {
        SeekerProfile seeker = currentUserService.getCurrentSeekerProfile();
        WorkerServiceListing listing = repository.findByIdAndSeekerProfileId(id, seeker.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found"));
        apply(listing, request);
        return map(repository.save(listing));
    }

    @Transactional
    public void delete(Long id) {
        SeekerProfile seeker = currentUserService.getCurrentSeekerProfile();
        WorkerServiceListing listing = repository.findByIdAndSeekerProfileId(id, seeker.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Service not found"));
        List<Availability> linkedAvailability = availabilityRepository.findByWorkerServiceListingIdOrderByStartDateAscStartTimeAsc(id);
        linkedAvailability.forEach(slot -> slot.setWorkerServiceListing(null));
        availabilityRepository.saveAll(linkedAvailability);
        repository.delete(listing);
    }

    private void apply(WorkerServiceListing target, WorkerServiceRequest request) {
        if (request.price() != null && request.pricingType() == WorkerServiceListing.PricingType.NEGOTIABLE)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Negotiable services should not include a fixed price");
        if (request.pricingType() != WorkerServiceListing.PricingType.NEGOTIABLE && request.price() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a price for this pricing method");
        target.setCategory(request.category().trim());
        target.setTitle(request.title().trim());
        target.setDescription(request.description().trim());
        target.setSkillsText(request.skills() == null ? "" : String.join("\n", request.skills().stream().map(String::trim).filter(v -> !v.isEmpty()).distinct().toList()));
        target.setPricingType(request.pricingType());
        target.setPrice(request.price());
        target.setMinimumDurationHours(request.minimumDurationHours());
        target.setServiceArea(request.serviceArea() == null ? "" : request.serviceArea().trim());
        target.setActive(request.active());
        target.setNegotiable(Boolean.TRUE.equals(request.negotiable()));
    }

    private WorkerServiceResponse map(WorkerServiceListing listing) {
        List<String> skills = listing.getSkillsText() == null || listing.getSkillsText().isBlank() ? List.of() : Arrays.stream(listing.getSkillsText().split("\\R")).filter(v -> !v.isBlank()).toList();
        return new WorkerServiceResponse(listing.getId(), listing.getSeekerProfile().getId(), listing.getCategory(), listing.getTitle(), listing.getDescription(), skills, listing.getPricingType(), listing.getPrice(), listing.getMinimumDurationHours(), listing.getServiceArea(), listing.isActive(), listing.isNegotiable(), listing.getCreatedAt(), listing.getUpdatedAt());
    }
}
