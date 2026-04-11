package com.chatly;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ChatlyBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChatlyBackendApplication.class, args);
    }

}
