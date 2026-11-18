
package com.shrambazar.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class ProfilePictureWebConfig implements WebMvcConfigurer {

    private final Path storageDirectory;

    public ProfilePictureWebConfig(
            @Value("${app.storage.profile-picture-dir}")
            String storageDirectory
    ) {
        this.storageDirectory = Paths.get(storageDirectory)
                .toAbsolutePath()
                .normalize();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {

        registry.addResourceHandler("/uploads/profile-pictures/**")
                .addResourceLocations(storageDirectory.toUri().toString());
    }
}
