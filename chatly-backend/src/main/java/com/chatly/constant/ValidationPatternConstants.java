package com.chatly.constant;

public final class ValidationPatternConstants {

    private ValidationPatternConstants() {
    }

    public static final String USERNAME_REGEX = "^[A-Za-z0-9]+$";
    public static final String DISPLAY_NAME_REGEX = "^[\\p{L}\\p{N}\\s._'\\-]{1,50}$";
}
