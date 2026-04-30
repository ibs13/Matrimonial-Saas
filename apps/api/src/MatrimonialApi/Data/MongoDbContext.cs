using MatrimonialApi.Models.Mongo;
using MongoDB.Driver;

namespace MatrimonialApi.Data;

public class MongoDbContext
{
    private readonly IMongoDatabase _db;

    public MongoDbContext(IConfiguration config)
    {
        var connectionString = config["MongoDB:ConnectionString"]
            ?? throw new InvalidOperationException("MongoDB:ConnectionString is not configured.");
        var databaseName = config["MongoDB:Database"]
            ?? throw new InvalidOperationException("MongoDB:Database is not configured.");

        var client = new MongoClient(connectionString);
        _db = client.GetDatabase(databaseName);

        EnsureIndexes();
    }

    public IMongoCollection<Profile> Profiles =>
        _db.GetCollection<Profile>("profiles");

    private void EnsureIndexes()
    {
        var profileIndexes = Profiles.Indexes;

        // Compound index for search: status + visibility + basic fields
        profileIndexes.CreateOne(new CreateIndexModel<Profile>(
            Builders<Profile>.IndexKeys
                .Ascending(p => p.Status)
                .Ascending(p => p.Visibility.ProfileVisible)
                .Ascending(p => p.Basic!.Gender)
                .Ascending(p => p.Basic!.Religion)
                .Ascending(p => p.Basic!.CountryOfResidence),
            new CreateIndexOptions { Name = "search_core" }
        ));

        // Index for profile lookup by completion + status (admin dashboard)
        profileIndexes.CreateOne(new CreateIndexModel<Profile>(
            Builders<Profile>.IndexKeys
                .Ascending(p => p.Status)
                .Descending(p => p.CompletionPercentage),
            new CreateIndexOptions { Name = "status_completion" }
        ));

        // Index for sorting by last active
        profileIndexes.CreateOne(new CreateIndexModel<Profile>(
            Builders<Profile>.IndexKeys.Descending(p => p.LastActiveAt),
            new CreateIndexOptions { Name = "last_active" }
        ));
    }
}
