namespace GoogleMapSample.Core.Dto
{
    public class ProximityDto
    {
        public decimal CenterLatitude { get; set; }
        public decimal CenterLongitude { get; set; }
        public int radius { get; set; }
        public string ExcludePolicyNumber { get; set; }
        public string BuildingGeoJson { get; set; }
    }
}