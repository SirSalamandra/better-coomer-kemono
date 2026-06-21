import { DatabaseConnection } from "./DatabaseConnection";
import { ArtistRepository } from "./ArtistRepository";
import { PostRepository } from "./PostRepository";
import { TrackingQueryService } from "./TrackingQueryService";
import { BackupService } from "./BackupService";
import { LegacyMigrationService } from "./LegacyMigrationService";
import { DatabaseServices } from "./contracts";

export function createDatabaseServices(): DatabaseServices {
  const connection = new DatabaseConnection();
  const artists = new ArtistRepository(() => connection.getDb());
  const posts = new PostRepository(() => connection.getDb());
  const tracking = new TrackingQueryService(artists, posts);
  const backup = new BackupService(connection);
  const legacy = new LegacyMigrationService();

  return {
    lifecycle: {
      init: () => connection.init(),
      close: async () => connection.close(),
    },
    version: {
      getTargetVersion: () => connection.targetVersion,
      getStoredVersion: () => connection.getStoredVersion(),
    },
    artists,
    posts,
    tracking,
    backup,
    legacy,
  };
}
