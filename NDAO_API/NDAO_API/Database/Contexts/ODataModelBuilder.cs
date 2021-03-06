﻿using NDAO_API.Database.Models;
using NDAO_API.ViewModels;
using Microsoft.AspNet.OData.Builder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OData.Edm;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace NDAO_API.Database.Contexts
{
    public class ODataModelBuilder
    {
        public IEdmModel GetEdmModel(IServiceProvider serviceProvider)
        {
            var builder = new ODataConventionModelBuilder(serviceProvider);

            builder.EntitySet<Goal>("Goals")
                .EntityType
                .Filter() // Allow for the $filter Command
                .Count() // Allow for the $count Command
                .Expand() // Allow for the $expand Command
                .OrderBy() // Allow for the $orderby Command
                .Page() // Allow for the $top and $skip Commands
                .Select();// Allow for the $select Command; 

            builder.EntitySet<Question>("Questions")
                .EntityType
                .Filter() // Allow for the $filter Command
                .Count() // Allow for the $count Command
                .Expand() // Allow for the $expand Command
                .OrderBy() // Allow for the $orderby Command
                .Page() // Allow for the $top and $skip Commands
                .Select();// Allow for the $select Command; 


            //#####################//
            // ACTIONS & FUNCTIONS //
            //#####################//

            //UploadFile//
            builder
                .Action("UploadFile")
                .Returns<FileDetails>()
                .Parameter<UploadFile>("fileData");

            //RemoveFile//
            builder
                .Action("RemoveFile")
                .Returns<bool>()
                .Parameter<UploadFile>("fileData");

            //RemoveAllFiles//
            builder
                .Action("RemoveAllFiles");

            //GetFilteredInstitutions//
            var function = builder.Function("GetFilteredInstitutions").ReturnsCollection<string>();
            function.Parameter<int>("region");
            function.Parameter<int>("sector");

            //GetTrafficLightData//
            //function = builder.Function("GetTrafficLightData").ReturnsCollection<GoalStatus>();
            //function.Parameter<int>("region");
            //function.Parameter<int>("sector");
            //function.Parameter<int>("goal");
            //function.Parameter<int>("year");
            //function.Parameter<string>("institution");

            //Goals as GeoJson
            builder.Namespace = "Extensions";
            builder.
                EntityType<Goal>().
                Collection.
                Function("GeoJson").
                Returns<JsonResult>();

            //Goals Filtered
            function = builder.EntityType<Goal>()
                .Collection
                .Function("GetGoalData")
                .ReturnsCollectionViaEntitySetPath<Goal>("bindingParameter");

            function.Parameter<int>("region");
            function.Parameter<int>("sector");
            function.Parameter<int>("goal");
            function.Parameter<int>("year");
            function.Parameter<string>("institution");
            //#####################//


            return builder.GetEdmModel();
        }
    }
}
