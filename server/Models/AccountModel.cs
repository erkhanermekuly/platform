using System.ComponentModel.DataAnnotations;

namespace server.Models
{
    public class AccountModel
    {
        public int Id { get; set; }

        [Required]
        public string Email { get; set; }

        [Required]
        public string PasswordHash { get; set; }
    }
}
