using server.Models;

namespace server.Infrastructure;

public static class CourseAccessRules
{
    public static DateTime? ComputeAccessExpiryUtc(DateTime nowUtc, CourseModel course)
    {
        if (course.AccessDurationDays is int d && d > 0)
        {
            return nowUtc.AddDays(d);
        }

        return null;
    }
}
