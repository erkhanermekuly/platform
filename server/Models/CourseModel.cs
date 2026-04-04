namespace server.Models;

public class CourseModel
{
    public int Id { get; set; }

    public required string Title { get; set; }

    public string? Description { get; set; }

    public required string Category { get; set; } // programming, design, etc.

    public required string Level { get; set; } // beginner, intermediate, advanced

    public double Rating { get; set; }

    public int Students { get; set; }

    public decimal Price { get; set; }

    public string? Image { get; set; }

    public string? Instructor { get; set; }

    public string? Duration { get; set; } // например "10 часов"
}
