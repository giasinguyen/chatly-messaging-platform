package com.chatly.dto.request;

import com.chatly.model.enums.ReportReason;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateReportRequest {

    @NotBlank(message = "INVALID_KEY")
    private String postId;

    @NotNull(message = "INVALID_KEY")
    private ReportReason reason;

    @Size(max = 500, message = "INVALID_KEY")
    private String description;
}
