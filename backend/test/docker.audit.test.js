import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';

describe('Docker Production Readiness Audit', () => {
  let dockerfileContent;
  let dockerComposeContent;

  before(() => {
    try {
      dockerfileContent = readFileSync('Dockerfile', 'utf8');
      dockerComposeContent = readFileSync('../docker-compose.yml', 'utf8');
    } catch (error) {
      console.error('Could not read Docker files:', error.message);
    }
  });

  describe('Dockerfile Security Analysis', () => {
    it('should use non-root container', () => {
      console.log('Dockerfile Security Analysis:');
      
      const hasNonRootUser = dockerfileContent.includes('USER nodejs');
      const hasUserCreation = dockerfileContent.includes('adduser --system --uid 1001 nodejs');
      const switchesToNonRoot = dockerfileContent.includes('USER nodejs') && 
                                dockerfileContent.lastIndexOf('USER nodejs') > 
                                dockerfileContent.lastIndexOf('CMD');

      console.log(`  Non-root user created: ${hasUserCreation}`);
      console.log(`  Switches to non-root: ${switchesToNonRoot}`);
      console.log(`  Final USER directive: ${hasNonRootUser}`);

      assert(hasNonRootUser, 'Dockerfile should use non-root user');
      assert(hasUserCreation, 'Should create non-root user with specific UID');
      assert(switchesToNonRoot, 'Should switch to non-root user before CMD');
    });

    it('should not expose sensitive information', () => {
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /key/i,
        /token/i,
        /private/i
      ];

      const containsSensitive = sensitivePatterns.some(pattern => 
        pattern.test(dockerfileContent)
      );

      console.log('Sensitive Information Check:');
      console.log(`  Contains sensitive patterns: ${containsSensitive}`);

      assert(!containsSensitive, 'Dockerfile should not contain sensitive information');
    });

    it('should use minimal base image', () => {
      const usesAlpine = dockerfileContent.includes('node:20-alpine');
      const usesMultiStage = dockerfileContent.includes('FROM base AS') &&
                               dockerfileContent.includes('FROM base AS builder') &&
                               dockerfileContent.includes('FROM base AS runner');

      console.log('Base Image Analysis:');
      console.log(`  Uses Alpine: ${usesAlpine}`);
      console.log(`  Uses multi-stage: ${usesMultiStage}`);

      assert(usesAlpine, 'Should use Alpine-based image for minimal size');
      assert(usesMultiStage, 'Should use multi-stage build for optimization');
    });

    it('should have proper health checks', () => {
      const hasHealthCheck = dockerfileContent.includes('HEALTHCHECK');
      const checksCorrectEndpoint = dockerfileContent.includes('/health');
      const hasReasonableTimeout = dockerfileContent.includes('--timeout=3s');
      const hasRetryLogic = dockerfileContent.includes('process.exit(res.statusCode === 200 ? 0 : 1)');

      console.log('Health Check Analysis:');
      console.log(`  Has HEALTHCHECK: ${hasHealthCheck}`);
      console.log(`  Checks correct endpoint: ${checksCorrectEndpoint}`);
      console.log(`  Reasonable timeout: ${hasReasonableTimeout}`);
      console.log(`  Proper exit code: ${hasRetryLogic}`);

      assert(hasHealthCheck, 'Should have HEALTHCHECK directive');
      assert(checksCorrectEndpoint, 'Should check /health endpoint');
      assert(hasReasonableTimeout, 'Should have reasonable timeout');
      assert(hasRetryLogic, 'Should handle health check response properly');
    });

    it('should set production environment', () => {
      const hasProductionEnv = dockerfileContent.includes('ENV NODE_ENV=production');
      const hasFixedPort = dockerfileContent.includes('ENV PORT=3000');
      const exposesPort = dockerfileContent.includes('EXPOSE 3000');

      console.log('Environment Configuration:');
      console.log(`  Production NODE_ENV: ${hasProductionEnv}`);
      console.log(`  Fixed PORT: ${hasFixedPort}`);
      console.log(`  Exposes port: ${exposesPort}`);

      assert(hasProductionEnv, 'Should set NODE_ENV=production');
      assert(hasFixedPort, 'Should set fixed PORT');
      assert(exposesPort, 'Should expose the port');
    });

    it('should optimize layer caching', () => {
      const copiesPackageJsonFirst = dockerfileContent.indexOf('COPY package*.json') < 
                                     dockerfileContent.indexOf('COPY .');
      const runsNpmCi = dockerfileContent.includes('npm ci');
      const cleansNpmCache = dockerfileContent.includes('npm cache clean');

      console.log('Layer Optimization:');
      console.log(`  Copies package.json first: ${copiesPackageJsonFirst}`);
      console.log(`  Uses npm ci: ${runsNpmCi}`);
      console.log(`  Cleans npm cache: ${cleansNpmCache}`);

      assert(copiesPackageJsonFirst, 'Should copy package.json first for better layer caching');
      assert(runsNpmCi, 'Should use npm ci for reproducible builds');
      assert(cleansNpmCache, 'Should clean npm cache to reduce image size');
    });
  });

  describe('Docker Compose Production Readiness', () => {
    it('should have proper service configuration', () => {
      const hasHealthChecks = dockerComposeContent.includes('healthcheck:');
      const hasRestartPolicy = dockerComposeContent.includes('restart: unless-stopped');
      const hasResourceLimits = dockerComposeContent.includes('deploy:') || 
                                     dockerComposeContent.includes('resources:');
      const hasVolumeMounts = dockerComposeContent.includes('volumes:');

      console.log('Docker Compose Configuration:');
      console.log(`  Has health checks: ${hasHealthChecks}`);
      console.log(`  Has restart policy: ${hasRestartPolicy}`);
      console.log(`  Has resource limits: ${hasResourceLimits}`);
      console.log(`  Has volume mounts: ${hasVolumeMounts}`);

      assert(hasHealthChecks, 'Services should have health checks');
      assert(hasRestartPolicy, 'Services should have restart policy');
      assert(hasVolumeMounts, 'Services should use volume mounts');
    });

    it('should use environment variables for secrets', () => {
      const usesEnvVars = dockerComposeContent.includes('${DB_PASSWORD}') ||
                              dockerComposeContent.includes('${REDIS_PASSWORD}') ||
                              dockerComposeContent.includes('${JWT_SECRET}');
      const hasNoHardcodedSecrets = !dockerfileContent.includes('password') &&
                                     !dockerfileContent.includes('secret') &&
                                     !dockerfileContent.includes('key');

      console.log('Secrets Management:');
      console.log(`  Uses environment variables: ${usesEnvVars}`);
      console.log(`  No hardcoded secrets: ${hasNoHardcodedSecrets}`);

      assert(usesEnvVars, 'Should use environment variables for secrets');
      assert(hasNoHardcodedSecrets, 'Should not hardcode secrets in Dockerfile');
    });

    it('should have proper networking configuration', () => {
      const hasCustomNetwork = dockerComposeContent.includes('networks:');
      const isolatesServices = dockerComposeContent.includes('knowledge-sharing-network');
      const usesInternalPorts = dockerComposeContent.includes('5432:5432') ||
                                     dockerComposeContent.includes('6379:6379');

      console.log('Network Configuration:');
      console.log(`  Custom network: ${hasCustomNetwork}`);
      console.log(`  Service isolation: ${isolatesServices}`);
      console.log(`  Internal port mapping: ${usesInternalPorts}`);

      assert(hasCustomNetwork, 'Should use custom network for service isolation');
      assert(isolatesServices, 'Services should be on custom network');
    });

    it('should have monitoring and logging configuration', () => {
      const hasMonitoringServices = dockerComposeContent.includes('prometheus:') ||
                                      dockerComposeContent.includes('grafana:') ||
                                      dockerComposeContent.includes('monitoring');
      const hasLogVolumes = dockerComposeContent.includes('./logs:/app/logs') ||
                                   dockerComposeContent.includes('logs:');
      const hasMetricsEndpoint = dockerfileContent.includes('/health/metrics');

      console.log('Monitoring Configuration:');
      console.log(`  Monitoring services: ${hasMonitoringServices}`);
      console.log(`  Log volumes: ${hasLogVolumes}`);
      console.log(`  Metrics endpoint: ${hasMetricsEndpoint}`);

      assert(hasLogVolumes, 'Should mount logs for external collection');
      // Monitoring services are optional but recommended
    });
  });

  describe('Image Size and Optimization Analysis', () => {
    it('should demonstrate multi-stage build benefits', () => {
      const stages = [
        'FROM base AS deps',
        'FROM base AS builder', 
        'FROM base AS runner'
      ];

      const hasAllStages = stages.every(stage => dockerfileContent.includes(stage));
      const copiesFromBuilder = (dockerfileContent.match(/COPY --from=builder/g) || []).length;
      const copiesFromDeps = (dockerfileContent.match(/COPY --from=deps/g) || []).length;

      console.log('Multi-stage Build Analysis:');
      console.log(`  Has all stages: ${hasAllStages}`);
      console.log(`  Copies from builder: ${copiesFromBuilder}`);
      console.log(`  Copies from deps: ${copiesFromDeps}`);

      assert(hasAllStages, 'Should have all build stages');
      assert(copiesFromBuilder >= 2, 'Should copy multiple artifacts from builder stage');
      assert(copiesFromDeps >= 1, 'Should copy dependencies from deps stage');
    });

    it('should minimize attack surface', () => {
      const removesDevDependencies = dockerfileContent.includes('--only=production');
      const usesSpecificNodeVersion = dockerfileContent.includes('node:20-alpine');
      const hasMinimalPackages = dockerfileContent.includes('apk add --no-cache libc6-compat');

      console.log('Attack Surface Analysis:');
      console.log(`  Excludes dev dependencies: ${removesDevDependencies}`);
      console.log(`  Uses specific Node version: ${usesSpecificNodeVersion}`);
      console.log(`  Minimal packages: ${hasMinimalPackages}`);

      assert(removesDevDependencies, 'Should exclude development dependencies');
      assert(usesSpecificNodeVersion, 'Should use specific Node version');
      assert(hasMinimalPackages, 'Should install minimal required packages');
    });
  });

  describe('Production Best Practices', () => {
    it('should follow Docker best practices', () => {
      const hasWorkingDir = dockerfileContent.includes('WORKDIR /app');
      const usesNpmCi = dockerfileContent.includes('npm ci');
      const hasExplicitVersion = dockerfileContent.includes('node:20');
      const hasHealthCheck = dockerfileContent.includes('HEALTHCHECK');
      const usesNonRoot = dockerfileContent.includes('USER nodejs');

      console.log('Best Practices Compliance:');
      console.log(`  Sets WORKDIR: ${hasWorkingDir}`);
      console.log(`  Uses npm ci: ${usesNpmCi}`);
      console.log(`  Explicit Node version: ${hasExplicitVersion}`);
      console.log(`  Has health check: ${hasHealthCheck}`);
      console.log(`  Uses non-root: ${usesNonRoot}`);

      const bestPracticesScore = [
        hasWorkingDir, usesNpmCi, hasExplicitVersion, 
        hasHealthCheck, usesNonRoot
      ].filter(Boolean).length;

      console.log(`  Best practices score: ${bestPracticesScore}/5`);

      assert(bestPracticesScore >= 4, 'Should follow at least 4/5 Docker best practices');
    });

    it('should be ready for orchestration', () => {
      const hasServiceLabels = dockerComposeContent.includes('labels:') ||
                                     dockerComposeContent.includes('container_name:');
      const hasDependencyManagement = dockerComposeContent.includes('depends_on:');
      const hasPortMapping = dockerComposeContent.includes('ports:');
      const hasEnvironmentConfig = dockerComposeContent.includes('environment:');

      console.log('Orchestration Readiness:');
      console.log(`  Service identification: ${hasServiceLabels}`);
      console.log(`  Dependency management: ${hasDependencyManagement}`);
      console.log(`  Port mapping: ${hasPortMapping}`);
      console.log(`  Environment config: ${hasEnvironmentConfig}`);

      const orchestrationScore = [
        hasServiceLabels, hasDependencyManagement, hasPortMapping, hasEnvironmentConfig
      ].filter(Boolean).length;

      console.log(`  Orchestration score: ${orchestrationScore}/4`);

      assert(orchestrationScore >= 3, 'Should be ready for orchestration (3/4+ requirements)');
    });
  });
});
