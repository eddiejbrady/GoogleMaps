namespace GoogleMapSample.Core
{
    public class Building
    {
        // Building data
        public string GroupRiskBuildingId { get; set; }
        public string BuildingId { get; set; }

        public string PolicyId { get; set; }
        public string GroupId { get; set; }
        public string LocationId { get; set; }

        public string ConstructionType { get; set; }
        public string PmlValue { get; set; }

        // Location data
        public string GroupRiskLocationId { get; set; }
        public string LocationDataWKT { get; set; }

        public string ProtectionClass { get; set; }
        public string Grade { get; set; }
        public string Area { get; set; }
        public string Stories { get; set; }
        public string Address1 { get; set; }
        public string Address2 { get; set; }
        public string Address3 { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string PostalCode { get; set; }

        public bool IsDirty { get; set; } = false;
    }
}
