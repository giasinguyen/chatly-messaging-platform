package com.chatly.config;

import com.chatly.model.enums.StoryPrivacy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;

import java.util.List;

@Configuration
@EnableMongoAuditing
public class MongoConfig {

    @Bean
    public MongoCustomConversions mongoCustomConversions() {
        return new MongoCustomConversions(List.of(new StoryPrivacyReadConverter()));
    }

    @ReadingConverter
    static class StoryPrivacyReadConverter implements Converter<String, StoryPrivacy> {
        @Override
        public StoryPrivacy convert(String source) {
            try {
                return StoryPrivacy.valueOf(source.toUpperCase());
            } catch (IllegalArgumentException e) {
                return StoryPrivacy.EVERYONE;
            }
        }
    }
}
