package com.chatly.dto.request;

import com.chatly.model.enums.PostVisibility;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateReelRequest {

    @Size(max = 1000, message = "Caption must not exceed 1000 characters")
    private String caption;

    private PostVisibility visibility;
}
