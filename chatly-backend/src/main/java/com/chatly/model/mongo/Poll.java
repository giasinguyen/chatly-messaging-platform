package com.chatly.model.mongo;

import lombok.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Poll {

    private String question;

    @Builder.Default
    private List<String> options = new ArrayList<>();

    @Builder.Default
    private boolean multipleChoice = false;

    /**
     * Map of optionIndex -> list of userIds who voted for that option
     */
    @Builder.Default
    private Map<String, List<String>> votes = new HashMap<>();

    /** True when the creator has locked the poll — no more voting allowed */
    @Builder.Default
    private Boolean closed = false;
}
