namespace server.DTOs;

public class ApiResponse<T>
{
    public bool Success { get; set; }

    public T? Data { get; set; }

    public string? Message { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null) => new()
    {
        Success = true,
        Data = data,
        Message = message
    };

    public static ApiResponse<T> Error(string message) => new()
    {
        Success = false,
        Message = message
    };
}

public class ApiResponse
{
    public bool Success { get; set; }

    public string? Message { get; set; }

    public static ApiResponse Ok(string? message = null) => new()
    {
        Success = true,
        Message = message
    };

    public static ApiResponse Error(string message) => new()
    {
        Success = false,
        Message = message
    };
}
