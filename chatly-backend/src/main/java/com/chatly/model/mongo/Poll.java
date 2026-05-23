package com.chatly.model.mongo;

import lombok.*;

import java.time.Instant;
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
    private Boolean multipleChoice = false;

    /**
     * Map of optionIndex -> list of userIds who voted for that option
     */
    @Builder.Default
    private Map<String, List<String>> votes = new HashMap<>();

    /** True when the creator has locked the poll — no more voting allowed */
    @Builder.Default
    private Boolean closed = false;

    /** Optional deadline after which voting is automatically closed */
    private Instant deadline;

    /** When true, voter identities are hidden from other participants */
    @Builder.Default
    private Boolean anonymous = false;
}
