#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import logger from '../src/config/logger.js';

class MigrationManager {
  constructor() {
    this.prisma = new PrismaClient();
    this.migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    this.backupDir = path.join(process.cwd(), 'backups');
  }

  async ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, `backup-${timestamp}.sql`);
    
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is required');
      }

      logger.info(`Creating backup: ${backupFile}`);
      
      // Extract database connection info from URL
      const dbUrl = new URL(databaseUrl);
      const dbName = dbUrl.pathname.slice(1); // Remove leading slash
      
      // Create backup using pg_dump
      const command = `pg_dump "${databaseUrl}" > "${backupFile}"`;
      execSync(command, { stdio: 'inherit' });
      
      logger.info(`Backup created successfully: ${backupFile}`);
      return backupFile;
    } catch (error) {
      logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  async migrate(direction = 'up', targetVersion = null) {
    try {
      logger.info(`Starting migration: ${direction}`);
      
      // Create backup before migrating up
      if (direction === 'up') {
        await this.createBackup();
      }

      const command = targetVersion 
        ? `npx prisma migrate ${direction} --to ${targetVersion}`
        : `npx prisma migrate ${direction}`;
      
      logger.info(`Running: ${command}`);
      execSync(command, { stdio: 'inherit', cwd: process.cwd() });
      
      logger.info(`Migration ${direction} completed successfully`);
      
      // Reset Prisma client to ensure it picks up new schema
      await this.prisma.$disconnect();
      this.prisma = new PrismaClient();
      
    } catch (error) {
      logger.error(`Migration ${direction} failed:`, error);
      throw error;
    }
  }

  async rollback(steps = 1) {
    try {
      logger.info(`Rolling back ${steps} migration(s)`);
      
      // Get migration history
      const history = await this.getMigrationHistory();
      if (history.length < steps) {
        throw new Error(`Cannot rollback ${steps} migrations. Only ${history.length} migrations available.`);
      }

      // Create backup before rollback
      await this.createBackup();

      // Rollback the specified number of steps
      for (let i = 0; i < steps; i++) {
        const targetMigration = history[history.length - 1 - i];
        logger.info(`Rolling back to: ${targetMigration}`);
        
        const command = `npx prisma migrate reset --force --skip-seed`;
        execSync(command, { stdio: 'inherit' });
        
        // Reapply migrations up to the target point
        if (i < steps - 1) {
          const remainingMigrations = history.slice(0, -(i + 1));
          for (const migration of remainingMigrations) {
            const migrateCommand = `npx prisma migrate deploy`;
            execSync(migrateCommand, { stdio: 'inherit' });
          }
        }
      }
      
      logger.info('Rollback completed successfully');
      
      // Reset Prisma client
      await this.prisma.$disconnect();
      this.prisma = new PrismaClient();
      
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }
  }

  async getMigrationHistory() {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY started_at ASC
      `;
      return result;
    } catch (error) {
      logger.error('Failed to get migration history:', error);
      return [];
    }
  }

  async getPendingMigrations() {
    try {
      const appliedMigrations = await this.getMigrationHistory();
      const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));
      
      if (!fs.existsSync(this.migrationsDir)) {
        return [];
      }
      
      const allMigrations = fs.readdirSync(this.migrationsDir)
        .filter(dir => fs.statSync(path.join(this.migrationsDir, dir)).isDirectory())
        .sort();
      
      return allMigrations.filter(migration => !appliedNames.has(migration));
    } catch (error) {
      logger.error('Failed to get pending migrations:', error);
      return [];
    }
  }

  async validateMigration() {
    try {
      logger.info('Validating migration...');
      
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check if schema is in sync
      try {
        await this.prisma.$queryRaw`SELECT * FROM _prisma_migrations LIMIT 1`;
      } catch (error) {
        if (error.code === '42P01') { // Table doesn't exist
          logger.warn('Prisma migrations table not found. Run migrate:deploy first.');
          return false;
        }
        throw error;
      }
      
      // Check for pending migrations
      const pending = await this.getPendingMigrations();
      if (pending.length > 0) {
        logger.warn(`Pending migrations found: ${pending.join(', ')}`);
        return false;
      }
      
      logger.info('Migration validation passed');
      return true;
    } catch (error) {
      logger.error('Migration validation failed:', error);
      return false;
    }
  }

  async reset() {
    try {
      logger.warn('Resetting database - this will delete all data');
      
      // Create backup before reset
      await this.createBackup();
      
      const command = 'npx prisma migrate reset --force --skip-seed';
      execSync(command, { stdio: 'inherit' });
      
      logger.info('Database reset completed');
      
      // Reset Prisma client
      await this.prisma.$disconnect();
      this.prisma = new PrismaClient();
      
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }

  async seed() {
    try {
      logger.info('Running database seed...');
      
      const command = 'npm run seed';
      execSync(command, { stdio: 'inherit' });
      
      logger.info('Database seeding completed');
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }

  async status() {
    try {
      const history = await this.getMigrationHistory();
      const pending = await this.getPendingMigrations();
      
      console.log('\n=== Migration Status ===');
      console.log(`Applied migrations: ${history.length}`);
      console.log(`Pending migrations: ${pending.length}`);
      
      if (history.length > 0) {
        console.log('\nApplied migrations:');
        history.forEach(migration => {
          console.log(`  ✓ ${migration.migration_name} (${migration.finished_at})`);
        });
      }
      
      if (pending.length > 0) {
        console.log('\nPending migrations:');
        pending.forEach(migration => {
          console.log(`  ⏳ ${migration}`);
        });
      }
      
      console.log('\n========================\n');
      
      return {
        applied: history,
        pending,
        isUpToDate: pending.length === 0
      };
    } catch (error) {
      logger.error('Failed to get migration status:', error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  const migrationManager = new MigrationManager();
  
  try {
    switch (command) {
      case 'up':
        await migrationManager.migrate('up', args[0]);
        break;
        
      case 'down':
        await migrationManager.migrate('down', args[0]);
        break;
        
      case 'rollback':
        const steps = parseInt(args[0]) || 1;
        await migrationManager.rollback(steps);
        break;
        
      case 'reset':
        await migrationManager.reset();
        break;
        
      case 'seed':
        await migrationManager.seed();
        break;
        
      case 'status':
        await migrationManager.status();
        break;
        
      case 'validate':
        const isValid = await migrationManager.validateMigration();
        process.exit(isValid ? 0 : 1);
        break;
        
      case 'backup':
        await migrationManager.createBackup();
        break;
        
      default:
        console.log(`
Usage: npm run migrate <command> [options]

Commands:
  up [version]     - Apply migrations (up to specific version if provided)
  down [version]   - Rollback migrations (down to specific version if provided)
  rollback [steps] - Rollback specified number of migrations (default: 1)
  reset            - Reset database and reapply all migrations
  seed             - Run database seed
  status           - Show migration status
  validate         - Validate migration state
  backup           - Create database backup

Examples:
  npm run migrate up
  npm run migrate rollback 2
  npm run migrate status
        `);
        process.exit(1);
    }
  } catch (error) {
    logger.error('Migration command failed:', error);
    process.exit(1);
  } finally {
    await migrationManager.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MigrationManager;
