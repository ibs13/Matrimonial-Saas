# Backup and Restore

## PostgreSQL

### Backup

**Using `pg_dump` via Docker:**
```bash
docker exec matrimonial-saas-postgres-1 \
  pg_dump -U matrimonial_user -d matrimonial_db -F c \
  > backup_$(date +%Y%m%d_%H%M%S).dump
```

Options explained:
- `-F c` — custom format (compressed, allows selective restore)
- Redirect to a `.dump` file outside the container

**If running natively:**
```bash
pg_dump -h localhost -p 5432 -U matrimonial_user -d matrimonial_db -F c > backup.dump
```

**Automated daily backup with Docker:**
Add a cron job on the host:
```bash
# /etc/cron.d/matrimonial-backup
0 2 * * * root docker exec matrimonial-saas-postgres-1 \
  pg_dump -U matrimonial_user -d matrimonial_db -F c \
  > /backups/postgres/$(date +\%Y\%m\%d).dump
```

### Restore

**Full restore (replaces all data):**
```bash
# Drop and recreate the database first
docker exec -it matrimonial-saas-postgres-1 \
  psql -U matrimonial_user -c "DROP DATABASE matrimonial_db;"
docker exec -it matrimonial-saas-postgres-1 \
  psql -U matrimonial_user -c "CREATE DATABASE matrimonial_db;"

# Restore from dump
docker exec -i matrimonial-saas-postgres-1 \
  pg_restore -U matrimonial_user -d matrimonial_db < backup.dump
```

**Selective restore (single table):**
```bash
docker exec -i matrimonial-saas-postgres-1 \
  pg_restore -U matrimonial_user -d matrimonial_db -t "Orders" < backup.dump
```

---

## MongoDB

### Backup

**Using `mongodump` via Docker:**
```bash
docker exec matrimonial-saas-mongo-1 \
  mongodump \
  --username mongo_user \
  --password change_me \
  --authenticationDatabase admin \
  --db matrimonial_profiles \
  --out /tmp/mongodump

docker cp matrimonial-saas-mongo-1:/tmp/mongodump ./mongodump_$(date +%Y%m%d_%H%M%S)
```

**Automated daily backup:**
```bash
# /etc/cron.d/matrimonial-mongo-backup
0 3 * * * root docker exec matrimonial-saas-mongo-1 \
  mongodump --username mongo_user --password change_me \
  --authenticationDatabase admin --db matrimonial_profiles \
  --out /tmp/mongodump && \
  docker cp matrimonial-saas-mongo-1:/tmp/mongodump /backups/mongo/$(date +\%Y\%m\%d)
```

### Restore

```bash
# Copy backup into container
docker cp ./mongodump matrimonial-saas-mongo-1:/tmp/mongodump

# Restore (drop + replace)
docker exec matrimonial-saas-mongo-1 \
  mongorestore \
  --username mongo_user \
  --password change_me \
  --authenticationDatabase admin \
  --db matrimonial_profiles \
  --drop \
  /tmp/mongodump/matrimonial_profiles
```

---

## Backup Strategy Recommendations

### Frequency

| Data | Recommended Frequency | Retention |
|------|-----------------------|-----------|
| PostgreSQL full dump | Daily at off-peak hours | 30 days |
| PostgreSQL WAL (point-in-time) | Continuous | 7 days |
| MongoDB full dump | Daily | 30 days |
| Photo files | Daily incremental | 30 days |

### Storage

- Store backups **off the production server** (S3, remote storage, different region)
- Encrypt backups at rest if they contain PII
- Test restore procedures quarterly — a backup that cannot be restored is not a backup

### Consistency

PostgreSQL and MongoDB are not backed up in the same transaction. For strict consistency:

1. Pause the API briefly (or take it out of the load balancer)
2. Take both backups within the same minute
3. Resume the API

For most operations, a few-second window between the two backups is acceptable because:
- The PostgreSQL search index can be rebuilt from MongoDB data
- Active users are few during off-peak hours

---

## Rebuilding the PostgreSQL Search Index from MongoDB

If `ProfileIndexes` becomes out of sync with MongoDB (e.g., after a partial restore), you can rebuild the index by running a re-sync script. There is no built-in endpoint for this in v1, but the logic is in `ProfileService.SyncIndexAsync`.

Trigger a re-sync for all profiles:
```sql
-- Check which profiles are missing from the index
SELECT p."Id" FROM "Users" u
LEFT JOIN "ProfileIndexes" p ON p."Id" = u."Id"
WHERE p."Id" IS NULL;
```

For each missing profile, call `POST /api/profile` with an admin token to initialize the index row, then re-save each section via the profile endpoints. In a large-scale restore scenario, write a one-off migration or admin script that calls `ProfileService.SyncIndexAsync(userId)` for each affected profile.

---

## Photo Files

Photos are stored on disk at `apps/api/src/MatrimonialApi/wwwroot/photos/` in development and in cloud storage in production.

**Dev backup:**
```bash
cp -r apps/api/src/MatrimonialApi/wwwroot/photos /backups/photos_$(date +%Y%m%d)
```

**Production (S3):** S3 has built-in versioning and cross-region replication. Enable S3 versioning on the photos bucket and configure cross-region replication to a backup bucket in a different AWS region.
