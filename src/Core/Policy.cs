using GeoJSON.Net.Feature;
using GeoJSON.Net.Geometry;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace GoogleMapSample.Core
{
    public class Policy
    {
        public Policy()
        {
            Buildings = new List<Building>();
        }

        public string GroupdRiskPolicyId { get; set; }
        public string PolicyId { get; set; }
        public string EffectiveDate { get; set; }
        public string ExpirationDate { get; set; }
        public string Name { get; set; }
        public string SourceSystem { get; set; }

        public List<Building> Buildings { get; set; }

        public string BuildingsToGeoJson()
        {
            var fc = new FeatureCollection();

            foreach (var building in Buildings)
            {
                string wkt = building.LocationDataWKT;
                string geoType = wkt.Substring(0, wkt.IndexOf("(")).Trim();
                string coord = wkt.Replace(geoType, "").Replace("(", "").Replace(")", "").Replace(", ", ",").Trim();

                IGeometryObject geometry = null;

                if (geoType == "POLYGON")
                {
                    geometry = new Polygon(new List<LineString>
                    {
                        new LineString(
                            coord.Split(',')
                                .Select(s => s.Split(' '))
                                .Select(a => new GeographicPosition(double.Parse(a[1]), double.Parse(a[0])))
                        )
                    });
                }
                else if (geoType == "POINT")
                {
                    geometry = new Point(
                                        coord.Split(',')
                                        .Select(s => s.Split(' '))
                                        .Select(a => new GeographicPosition(double.Parse(a[1]), double.Parse(a[0]))).First()
                    );
                }
                else
                {
                    throw new Exception("Invalid GeoJson geoType.  Value: " + geoType);
                }

                var props = new Dictionary<string, object>
                {
                    { "id", building.GroupRiskBuildingId },

                    // Building info
                    { "groupRiskBuildingId", building.GroupRiskBuildingId },
                    { "buildingId", building.BuildingId },

                    { "constructionType", building.ConstructionType },
                    { "pmlValue", building.PmlValue },

                    // Location info
                    { "groupRiskLocationId", building.GroupRiskLocationId },
                    { "protectionClass", building.ProtectionClass },
                    { "grade", building.Grade },
                    { "area", building.Area },
                    { "stories", building.Stories },
                    { "address1", building.Address1 },
                    { "address2", building.Address2 },
                    { "address3", building.Address3 },
                    { "city", building.City },
                    { "state", building.State },
                    { "postalCode", building.PostalCode },

                    { "isDirty", building.IsDirty.ToString() }
                };

                if (geometry != null)
                {
                    var feature = new GeoJSON.Net.Feature.Feature(geometry, props);
                    fc.Features.Add(feature);
                }
            }

            return JsonConvert.SerializeObject(fc);
        }
        public void GeoJsonToBuildings(string geoJson)
        {
            List<Building> buildings = new List<Building>();

            var featureCollection = JsonConvert.DeserializeObject<FeatureCollection>(geoJson);

            foreach (Feature item in featureCollection.Features)
            {
                var building = new Building();

                building.GroupRiskBuildingId = item.Properties["groupRiskBuildingId"].ToString();
                building.BuildingId = item.Properties["buildingId"].ToString();
                building.ConstructionType = item.Properties["constructionType"].ToString();
                building.PmlValue = item.Properties["pmlValue"].ToString();
                building.GroupRiskLocationId = item.Properties["groupRiskLocationId"].ToString();
                building.ProtectionClass = item.Properties["protectionClass"].ToString();
                building.Grade = item.Properties["grade"].ToString();
                building.Area = item.Properties["area"].ToString();
                building.Stories = item.Properties["stories"].ToString();
                building.Address1 = item.Properties["address1"].ToString();
                building.Address2 = item.Properties["address2"].ToString();
                building.Address3 = item.Properties["address3"].ToString();
                building.City = item.Properties["city"].ToString();
                building.State = item.Properties["state"].ToString();
                building.PostalCode = item.Properties["postalCode"].ToString();

                building.IsDirty = (item.Properties["isDirty"].ToString().ToLower() == "true" ? true : false);

                if (item.Geometry is Point)
                {
                    Point p = (Point)item.Geometry;
                    GeographicPosition position = (GeographicPosition) p.Coordinates;
                    var wkt = "POINT(" + position.Longitude.ToString() + " " + position.Latitude.ToString() + ")";
                    building.LocationDataWKT = wkt;

                }
                else if (item.Geometry is Polygon)
                {
                    Polygon p = (Polygon)item.Geometry;
                    StringBuilder wkt = new StringBuilder(500);

                    wkt.Append("POLYGON((");
                    foreach (var lineString in p.Coordinates)
                    {
                        foreach (var point in lineString.Coordinates)
                        {
                            GeographicPosition position = (GeographicPosition) point;
                            wkt.Append(position.Longitude.ToString() + " " + position.Latitude.ToString() + ", ");
                        }
                        wkt.Remove(wkt.Length - 2, 2);
                    }
                    wkt.Append("))");
                    building.LocationDataWKT = wkt.ToString();
                }
                else
                {

                }

                buildings.Add(building);
            }

            Buildings.Clear();
            Buildings.AddRange(buildings);
        }
    }
}
