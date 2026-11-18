
package com.shrambazar.service.profile;

import com.shrambazar.dto.profile.*;
import com.shrambazar.entity.*;
import com.shrambazar.repository.QualificationRepository;
import com.shrambazar.service.CurrentUserService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class QualificationService {

    private final QualificationRepository qualificationRepository;
    private final CurrentUserService currentUserService;

    public QualificationService(
            QualificationRepository qualificationRepository,
            CurrentUserService currentUserService) {
        this.qualificationRepository = qualificationRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<QualificationResponse> getMyQualifications() {
        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        return qualificationRepository.findBySeekerProfileId(profile.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public QualificationResponse addQualification(
            QualificationRequest request) {

        validateDates(request.startDate(), request.endDate(),
                request.currentlyStudying());

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        Qualification qualification = new Qualification();
        qualification.setSeekerProfile(profile);

        applyRequest(qualification, request);

        return mapToResponse(
                qualificationRepository.save(qualification)
        );
    }

    @Transactional
    public QualificationResponse updateQualification(
            Long id, QualificationRequest request) {

        validateDates(request.startDate(), request.endDate(),
                request.currentlyStudying());

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        Qualification qualification =
                qualificationRepository.findByIdAndSeekerProfileId(
                        id, profile.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Qualification not found"
                        )
                );

        applyRequest(qualification, request);

        return mapToResponse(qualification);
    }

    @Transactional
    public void deleteQualification(Long id) {

        SeekerProfile profile =
                currentUserService.getCurrentSeekerProfile();

        Qualification qualification =
                qualificationRepository.findByIdAndSeekerProfileId(
                        id, profile.getId()
                ).orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Qualification not found"
                        )
                );

        qualificationRepository.delete(qualification);
    }

    private void applyRequest(
            Qualification qualification,
            QualificationRequest request) {

        qualification.setQualificationName(request.qualificationName().trim());
        qualification.setInstitution(request.institution());
        qualification.setFieldOfStudy(request.fieldOfStudy());
        qualification.setStartDate(request.startDate());
        qualification.setEndDate(request.endDate());
        qualification.setCurrentlyStudying(request.currentlyStudying());
    }

    private void validateDates(
            LocalDate startDate,
            LocalDate endDate,
            boolean currentlyStudying) {

        if (currentlyStudying && endDate != null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End date must be empty for an ongoing qualification"
            );
        }

        if (!currentlyStudying && endDate == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End date is required for a completed qualification"
            );
        }

        if (endDate != null && endDate.isBefore(startDate)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "End date cannot be before start date"
            );
        }
    }

    private QualificationResponse mapToResponse(
            Qualification qualification) {

        return new QualificationResponse(
                qualification.getId(),
                qualification.getQualificationName(),
                qualification.getInstitution(),
                qualification.getFieldOfStudy(),
                qualification.getStartDate(),
                qualification.getEndDate(),
                qualification.isCurrentlyStudying()
        );
    }
}
