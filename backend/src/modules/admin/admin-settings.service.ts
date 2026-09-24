import { Injectable } from '@nestjs/common';

export interface SystemSettings {
  allowRegistration: boolean;
  maintenanceMode: boolean;
}

@Injectable()
export class AdminSettingsService {
  // Simple in-memory state for demonstration
  // In a real application, this might be saved to a database table or Redis
  private settings: SystemSettings = {
    allowRegistration: true,
    maintenanceMode: false,
  };

  getSettings(): SystemSettings {
    return this.settings;
  }

  updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.settings = { ...this.settings, ...updates };
    return this.settings;
  }
}
