package com.chatly.dto.request;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupUpdateRequest {

    private String name;
    private String avatar;
    private Boolean allowMembersUpdateInfo;
    private Boolean requireApproval;
    private Boolean aiProactiveEnabled;
}
