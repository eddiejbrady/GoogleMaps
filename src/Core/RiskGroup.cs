using GeoJSON.Net.Feature;
using GeoJSON.Net.Geometry;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace GoogleMapSample.Core
{
    public class RiskGroup
    {
        public RiskGroup()
        {
            Buildings = new List<Building>();
        }

        public string PolicyInScope { get; set; }
        public string GroupId { get; set; }
        public string StartDate { get; set; }
        public string EndDate { get; set; }
        public string GroupRiskPolicyId { get; set; }
        public string PolicyId { get; set; }
        public string LocationDataWKT { get; set; }
        public string PmlValue { get; set; }

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

                    { "policyId", building.PolicyId },
                    { "groupId", building.GroupId },
                    { "locationId", building.LocationId },

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

        public string RiskGroupToGeoJson()
        {
            var fc = new FeatureCollection();

            string wkt = LocationDataWKT;

            if (!String.IsNullOrEmpty(wkt))
            {
                IGeometryObject geometry = null;

                string geoType = wkt.Substring(0, wkt.IndexOf("(")).Trim();

                string wktPrepared = String.Empty;
            
                if (geoType == "POINT")
                {
                    wktPrepared = wkt.Replace(geoType, "").Trim().Replace("((", "").Replace("))", "").Replace("(", "").Replace(")", "");

                    var input = wktPrepared;

                    geometry = input.Split(',')
                                    .Select(s => s.Split(' '))
                                    .Select(a => new GeographicPosition(double.Parse(a[1]), double.Parse(a[0])))
                                    .Select(a => new Point(a))
                                    .FirstOrDefault();
                }
                else if (geoType == "POLYGON")
                {
                    wktPrepared = wkt.Replace(geoType, "").Trim().Replace("((", "").Replace("))", "").Replace(", ", ",");

                    string[] input = Regex.Split(wktPrepared, @",");

                    List<GeographicPosition> geometryList = input
                                                        .Select(s => s.Split(' '))
                                                        .Select(a => new GeographicPosition(double.Parse(a[1]), double.Parse(a[0])))
                                                        .ToList();

                    geometry = new Polygon(new List<LineString> { new LineString(geometryList) });
                }
                else if (geoType == "MULTIPOINT")
                {
                    wktPrepared = wkt.Replace(geoType, "").Trim().Replace("((", "").Replace("))", "").Replace("(", "").Replace(", ", ",");

                    string[] points = Regex.Split(wktPrepared, @"\),");

                    List<Point> geometryList = points
                        .Select(s => s.Split(' '))
                        .Select(a => new GeographicPosition(double.Parse(a[1]), double.Parse(a[0])))
                        .Select(a => new Point(a))
                        .ToList();

                    geometry = new MultiPoint(geometryList);

                }
                else if (geoType == "MULTIPOLYGON")
                {
                    wktPrepared = wkt.Replace(geoType, "").Trim().Replace("(((", "").Replace(")))", "").Replace("(", "");

                    string[] polys = Regex.Split(wktPrepared, @"\)\),");

                    List<Polygon> polyList = new List<Polygon>();

                    foreach (var element in polys.Select(s => s.Split(',')))
                    {
                        List<GeographicPosition> posList = element
                            .Select(s => s.Trim().Split(' '))
                            .Select(a => new GeographicPosition(double.Parse(a[1]), double.Parse(a[0])))
                            .ToList();

                        polyList.Add(new Polygon(new List<LineString> { new LineString(posList) }));
                    }

                    geometry = new MultiPolygon(polyList);
                }
                else
                {
                    throw new Exception("Invalid GeoJson geoType.  Value: " + geoType);
                }

                var props = new Dictionary<string, object>
                {
                    { "id", this.GroupId },

                    // Building info
                    { "policyInScope", this.PolicyInScope },
                    { "startDate", this.StartDate },
                    { "endDate", this.EndDate },
                    { "groupRiskPolicyId", this.GroupRiskPolicyId },
                    { "policyid", this.PolicyId }
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
