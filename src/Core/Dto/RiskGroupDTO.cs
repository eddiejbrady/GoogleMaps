namespace GoogleMapSample.Core.Dto
{
    public class RiskGroupDto
    {
        public decimal CenterLatitude { get; set; }
        public decimal CenterLongitude { get; set; }
        public int radius { get; set; }
        public string ExcludePolicyNumber { get; set; }

        public string RiskGroupGeoJson { get; set; }
        public string BuildingGeoJson { get; set; }
    }
}