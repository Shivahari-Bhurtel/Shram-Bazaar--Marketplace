
package com.shrambazar.controller.calendar;

import com.shrambazar.dto.calendar.CalendarEntryResponse;
import com.shrambazar.service.calendar.SeekerCalendarService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/seeker/calendar")
public class CalendarController {

    private final SeekerCalendarService calendarService;

    public CalendarController(
            SeekerCalendarService calendarService
    ) {
        this.calendarService = calendarService;
    }

    @GetMapping
    public List<CalendarEntryResponse> getMyCalendar(

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate

    ) {
        return calendarService.getMyCalendar(startDate, endDate);
    }
}
