package com.shrambazar.controller.notification;
import com.shrambazar.dto.notification.ConversationDtos.*;
import com.shrambazar.service.notification.ConversationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/conversations")
public class ConversationController {
 private final ConversationService service; public ConversationController(ConversationService service){this.service=service;}
 @GetMapping public List<ConversationResponse> list(){return service.list();}
 @GetMapping("/unread-count") public UnreadResponse unread(){return service.unread();}
 @PostMapping public ConversationResponse open(@RequestBody OpenRequest request){return service.open(request.applicationId());}
 @PostMapping("/workers/{workerUserId}") public ConversationResponse openWithWorker(@PathVariable Long workerUserId){return service.openWithWorker(workerUserId);}
 @GetMapping("/{id}") public ThreadResponse thread(@PathVariable Long id){return service.thread(id);}
 @PostMapping("/{id}/messages") public MessageResponse send(@PathVariable Long id,@Valid @RequestBody SendRequest request){return service.send(id,request.content());}
 @PostMapping("/{id}/read") public void read(@PathVariable Long id){service.markRead(id);}
}
