using GeoJSON.Net.Feature;
using GeoJSON.Net.Geometry;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GoogleMapSample.Core
{
    public class Proximity
    {
        public Proximity()
        {
            Buildings = new List<Building>();
        }

        public List<Building> Buildings { get; set; }

        public string BuildingsToGeoJson()
        {
            var fc = new FeatureCollection();

            var buildings = Buildings.Where(w => w.LocationDataWKT != "");

            foreach (var building in buildings)
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
    }
}
