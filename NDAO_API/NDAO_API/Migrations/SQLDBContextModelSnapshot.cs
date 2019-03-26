﻿// <auto-generated />
using System;
using NDAO_API.Database.Contexts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace NDAO_API.Migrations
{
    [DbContext(typeof(SQLDBContext))]
    partial class SQLDBContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "2.1.4-rtm-31024")
                .HasAnnotation("Relational:MaxIdentifierLength", 128)
                .HasAnnotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn);

            modelBuilder.Entity("CCIS_API.Database.Models.Goal", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd();

                    b.Property<string>("CreateDate");

                    b.Property<Guid?>("CreateUser");

                    b.Property<string>("Status");

                    b.Property<int>("Type");

                    b.Property<string>("UpdateDate");

                    b.Property<Guid?>("UpdateUser");

                    b.HasKey("Id");

                    b.ToTable("Goals");
                });

            modelBuilder.Entity("CCIS_API.Database.Models.Question", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd();

                    b.Property<Guid?>("GoalId");

                    b.Property<string>("Key");

                    b.Property<string>("Value");

                    b.HasKey("Id");

                    b.HasIndex("GoalId");

                    b.ToTable("Questions");
                });

            modelBuilder.Entity("CCIS_API.Database.Models.Question", b =>
                {
                    b.HasOne("CCIS_API.Database.Models.Goal", "Goal")
                        .WithMany("Questions")
                        .HasForeignKey("GoalId");
                });
#pragma warning restore 612, 618
        }
    }
}