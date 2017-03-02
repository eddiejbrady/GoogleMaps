using GoogleMapSample.Core.Dto;
using System.IO;
using System.Web.Http;

namespace GoogleMapSample.Controllers.Api
{
    public class ProximityDataLayerController : ApiController
    {
        string _path = System.Web.HttpContext.Current.Server.MapPath("~/persistence/data/Proximity.json");

        [Route("api/proximityDataLayer/")]
        [HttpGet]
        public IHttpActionResult Get([FromUri] ProximityDto proximityDto)
        {
            var dto = new ProximityDto();

            var geoJson = File.ReadAllText(_path);

            dto.CenterLatitude = proximityDto.CenterLatitude;
            dto.CenterLongitude = proximityDto.CenterLongitude;
            dto.radius = proximityDto.radius;
            dto.ExcludePolicyNumber = proximityDto.ExcludePolicyNumber;
            dto.BuildingGeoJson = geoJson;

            return Ok(dto);
        }
    }
}