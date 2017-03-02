using GoogleMapSample.Core.Dto;
using System.IO;
using System.Web.Http;
using System.Web.Routing;

namespace GoogleMapSample.Controllers.Api
{
    public class PolicyDataLayerController : ApiController
    {
        string _path = System.Web.HttpContext.Current.Server.MapPath("~/persistence/data/Policy.json");

        [Route("api/policyDataLayer/{policyNumber}")]
        [HttpGet]
        public IHttpActionResult Get(string policyNumber)
        {
            var dto = new PolicyDto();

            if (policyNumber == "123")
            {
                var geoJson = File.ReadAllText(_path);

                dto.PolicyId = policyNumber;
                dto.GroupdRiskPolicyId = "123";
                dto.Name = "Test";
                dto.SourceSystem = "Test";
                dto.EffectiveDate = "09/07/2016 10:00 AM";
                dto.ExpirationDate = "09/07/2017 10:00 AM";
                dto.BuildingGeoJson = geoJson;
            }

            return Ok(dto);
        }

        [HttpPut]
        [Route("api/policyDataLayer")]
        public IHttpActionResult Put(PolicyDto dto)
        {
            File.WriteAllText(_path, dto.BuildingGeoJson);
            return Ok("Ok");
        }
    }
}