namespace GoogleMapSample.Core.Dto
{
    public class PolicyDto
    {
        public string GroupdRiskPolicyId { get; set; }
        public string PolicyId { get; set; }
        public string EffectiveDate { get; set; }
        public string ExpirationDate { get; set; }
        public string Name { get; set; }
        public string SourceSystem { get; set; }

        public string BuildingGeoJson { get; set; }
    }
}