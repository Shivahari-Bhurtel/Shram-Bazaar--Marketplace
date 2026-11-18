FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml mvnw ./
COPY .mvn .mvn
COPY src src
RUN chmod +x mvnw && ./mvnw -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
ENV VERIFICATION_STORAGE_DIR=/tmp/shrambazar-verification \
    PROFILE_PICTURE_STORAGE_DIR=/tmp/shrambazar-profile-pictures
COPY --from=build /workspace/target/shrambazar-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
