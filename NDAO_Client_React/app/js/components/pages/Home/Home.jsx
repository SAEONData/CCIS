'use strict'

import React from 'react'
import { connect } from 'react-redux'
import { Row, Col, Button, Collapse, NavLink } from 'mdbreact'
import { DEAGreen, DEAGreenDark } from "../../../config/colours.js"
import AME_Banner from './AME_Banner.jsx'
import AME_Info from './AME_Info.jsx'
import LessInfoBtn from './LessInfoBtn.jsx'
import TrafficLights from './TrafficLights.jsx'
import YearFilter from './Filters/YearFilter.jsx'
import RegionFilter from './Filters/RegionFilter.jsx'
import SectorFilter from './Filters/SectorFilter.jsx'
import GoalFilter from './Filters/GoalFilter.jsx'
import { apiBaseURL, vmsBaseURL } from '../../../../js/config/serviceURLs.js'
import InstitutionFilter from './Filters/InstitutionFilter.jsx'
import MapViewCore from '../../visualization/Map/MapViewCore.jsx'
// import NCCRD_Preview from './NCCRD_Preview/NCCRD_Preview.jsx'
// import NDMC_Preview from './NDMC_Preview/NDMC_Preview.jsx'
// import SARVA_Preview from './SARVA_Preview/SARVA_Preview.jsx'
// import FundingIGFX from './InfoGraphics/FundingIGFX.jsx'
// import PlansIGFX from './InfoGraphics/PlansIGFX.jsx'
// import GovernmentsIGFX from './InfoGraphics/GovernmentsIGFX.jsx'
// import GHGReductionIGFX from './InfoGraphics/GHGReductionIGFX.jsx'
// import SectorsIGFX from './InfoGraphics/SectorsIGFX.jsx'
import GoalDetails from './GoalDetails.jsx'
import { CSVLink } from 'react-csv'
import { CustomFetch } from '../../../globalFunctions.js';

const mapStateToProps = (state, props) => {
  return {}
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateNav: payload => {
      dispatch({ type: "NAV", payload })
    },
    setLoading: payload => {
      dispatch({ type: "SET_LOADING", payload })
    }
  }
}

class Home extends React.Component {

  constructor(props) {
    super(props);

    let filterRegion = 0
    let filterRegionParent = 0
    let filterSector = 0
    let filterGoal = 1
    let filterYear = (new Date()).getFullYear()
    let filterInstitution = ""

    this.state = {
      infoSection: false,
      filterRegion,
      filterRegionParent,
      filterSector,
      filterGoal,
      filterYear,
      filterInstitution,
      filterInstitutionOptions: [],
      goalData: [],
      goalDataUnfiltered: [],
      prevFilters: { filterRegion, filterSector, filterGoal, filterYear, filterInstitution },
      trafficLightFull: false,
      mapFullView: false
    }

    this.handleFilterChange = this.handleFilterChange.bind(this)
  }

  componentDidMount() {
    this.props.updateNav(location.hash)

    //Get Goal data for info-graphics
    this.getGoalDataUnfiltered()

    //Apply default filtering
    this.handleFilterChange(true)
  }

  componentDidUpdate() {
    //Apply filtering
    this.handleFilterChange(false)
  }

  handleFilterChange(autoSelect = false) {

    let { filterRegion, filterSector, filterGoal, filterYear, filterInstitution, prevFilters } = this.state
    let getInstitutions = false
    let getTrafficLightData = false

    if (prevFilters.filterRegion !== filterRegion) {
      getInstitutions = true
      getTrafficLightData = true
    }
    if (prevFilters.filterSector !== filterSector) {
      getInstitutions = true
      getTrafficLightData = true
    }
    if (prevFilters.filterGoal !== filterGoal) {
      //will be used for map
    }
    if (prevFilters.filterYear !== filterYear) {
      getTrafficLightData = true
    }
    if (prevFilters.filterInstitution !== filterInstitution) {
      getTrafficLightData = true
    }

    if (getInstitutions === true || getTrafficLightData === true || autoSelect === true) {

      //update state
      this.setState({ prevFilters: { filterRegion, filterSector, filterGoal, filterYear, filterInstitution } },

        () => {
          let { filterRegion, filterSector, filterInstitution } = this.state

          //Fetch Institutions
          if (getInstitutions === true || autoSelect === true) {
            this.getInstitutions(filterRegion, filterSector, filterInstitution)
          }

          //Fetch Goal data
          if (getTrafficLightData === true || autoSelect === true) {
            this.getGoalData(filterRegion, filterSector, filterGoal, filterYear, filterInstitution)
          }

          //Fetch Regions data
          this.getFilterRegionParent(filterRegion)
        })
    }
  }

  async getInstitutions(filterRegion, filterSector, filterInstitution) {

    let { setLoading } = this.props
    setLoading(true)

    try {
      let res = await CustomFetch(apiBaseURL +
        `GetFilteredInstitutions(region=${filterRegion},sector=${filterSector})`)

      if (res.ok) {
        res = await res.json() //parse response

        if (res.value) {
          this.setState({
            filterInstitutionOptions: res.value,
            filterInstitution: res.value.filter(x => x === filterInstitution).length > 0 ? filterInstitution : ""
          })
        }
      }
    }
    catch (ex) {
      console.error(ex)
    }
    finally {
      setLoading(false)
    }
  }

  async getGoalData(filterRegion, filterSector, filterGoal, filterYear, filterInstitution) {

    let { setLoading } = this.props
    setLoading(true)

    try {
      let res = await CustomFetch(
        apiBaseURL + 
        "Goals/Extensions." +
        `GetGoalData(region=${filterRegion},sector=${filterSector},goal=${filterGoal},year=${filterYear},institution='${filterInstitution}')` +
        "?$expand=Questions"    
        )

      if (res.ok) {
        res = await res.json() //parse response
        if (res) {
          this.setState({ goalData: res.value })
        }
      }
    }
    catch (ex) {
      console.error(ex)
    }
    finally {
      setLoading(false)
    }
  }

  async getGoalDataUnfiltered() {

    let { setLoading } = this.props
    setLoading(true)

    try {
      let res = await CustomFetch(apiBaseURL + "Goals?$expand=Questions")

      if (res.ok) {
        res = await res.json() //parse response
        if (res) {
          this.setState({ goalDataUnfiltered: res.value })
        }
      }
    }
    catch (ex) {
      console.error(ex)
    }
    finally {
      setLoading(false)
    }
  }

  async getFilterRegionParent(filterRegion) {

    let { setLoading } = this.props
    setLoading(true)

    let parentSet = false
    try {
      let res = await CustomFetch(vmsBaseURL + 'Regions/Flat')

      if (res.ok) {
        res = await res.json() //parse response

        if (res.items) {

          let searchRegions = res.items.filter(r => r.id == filterRegion)
          if (searchRegions.length > 0) {

            let searchPK = searchRegions[0].additionalData.filter(a => a.key === "ParentId")
            if (searchPK.length > 0 && !isNaN(searchPK[0].value)) {

              parentSet = true
              this.setState({
                filterRegionParent: parseInt(searchPK[0].value)
              })
            }
          }
        }
      }
    }
    catch (ex) {
      console.error(ex)
    }
    finally {

      if (parentSet === false) {
        this.setState({
          filterRegionParent: parseInt(filterRegion)
        })
      }

      setLoading(false)
    }
  }

  render() {

    let {
      infoSection, filterYear, filterRegion, filterRegionParent, filterSector, filterGoal, filterInstitution,
      goalData, trafficLightFull, mapFullView
    } = this.state

    let qData = [{
      Id: "",
      Key: "",
      Value: ""
    }]

    return (
      <div style={{ padding: "0px 15px 15px 15px", borderRadius: "10px" }}>

        <AME_Banner />

        {/* <div style={{ height: 3 }} /> */}

        <Row style={{ marginTop: -5 }}>
          <Col sm="6">
            <LessInfoBtn
              infoSection={infoSection}
              callback={(ifoSec) => { this.setState({ infoSection: !ifoSec }) }}
            />
          </Col>
          <Col sm="6" style={{ textAlign: "right" }}>
            <CSVLink
              data={[...this.state.goalData]}
              headers={['Id', 'Type', 'CreateDate', 'Status']}
              filename={"DAO-list.csv"}
              style={{
                minHeight: 35,
                marginRight: 15,
                textDecoration: 'none',
                color: 'white',
                backgroundColor: DEAGreen,
                padding: "12px 25px 10px 25px",
                borderRadius: 2,
                fontSize: 10,
                // border: "1px solid dimgrey",
                fontWeight: 400,
                boxShadow:"0 5px 11px 0 rgba(0, 0, 0, 0.18), 0 4px 15px 0 rgba(0, 0, 0, 0.15)"
              }}
              asyncOnClick={true}
            >
              DOWNLOAD DAO DATA
            </CSVLink>

            <Button
              size="sm"
              onClick={() => { location.hash = "#/ame/contribute" }}
              //style={{ margin: "35px 5px 0px 0px" }}
              style={{
                minHeight: 35,
                //paddingTop: 10,
                marginRight: 0,
                marginLeft: 0
              }}
              color="warning">Submit your contribution
            </Button>
            <Button
              color=""
              style={{ 
                minHeight: 35,
                //paddingTop: 10,
                marginRight: 0,
                marginLeft: 15,
                backgroundColor: DEAGreen }}
              size="sm"
              onClick={() => {
                // if (!user || user.expired) {
                //   <NavLink to="/login"><b>Login</b></NavLink>
                //   // notification.warning({
                //   //   message: 'Please login to submit your contribution.'
                //   // })
                // }
                // else {
                  window.open("https://drive.google.com/file/d/1ebKu_C9SEy36gnHMQS7B3Lgb7QqObeVR/view?usp=sharing")
                }
              }>
              
              Bulk upload
            </Button>
          </Col>
        </Row>

        <Collapse isOpen={infoSection}>
          <AME_Info />
        </Collapse>

        <div style={{ height: 5 }} />

        <div style={{ borderTop: "1px solid gainsboro", borderBottom: "1px solid gainsboro", paddingTop: "12px", paddingBottom: "8px" }}>
          <Row >
            <Col md="3" style={{ marginBottom: "3px" }}>
              <RegionFilter
                value={filterRegion}
                callback={(value) => { this.setState({ filterRegion: value }) }}
              />
            </Col>
            <Col md="3" style={{ marginBottom: "3px" }}>
              <SectorFilter
                value={filterSector}
                callback={(value) => { this.setState({ filterSector: value }) }}
              />
            </Col>
            <Col md="6">
              <InstitutionFilter
                data={this.state.filterInstitutionOptions}
                value={this.state.filterInstitution}
                callback={(value) => {
                  this.setState({ filterInstitution: value.text })
                }}
              />
            </Col>
          </Row>

          <Row style={{ marginTop: "7px" }}>
            <Col md="3" style={{ marginBottom: "3px" }}>
              <GoalFilter
                value={filterGoal}
                callback={(value) => { this.setState({ filterGoal: value }) }}
              />
            </Col>
            <Col md="6">
              <YearFilter
                value={filterYear}
                callback={(value) => { this.setState({ filterYear: value }) }}
              />
            </Col>
            <Col md="3">
              <Button
                size="sm"
                style={{
                  height: "31px",
                  marginTop: "0px",
                  paddingTop: 6,
                  width: "100%",
                  fontSize: "13px",
                  marginLeft: "0px",
                  backgroundColor: DEAGreen
                }}
                color=""
                onClick={() => {
                  this.setState({
                    filterYear: (new Date()).getFullYear(),
                    filterRegion: 0,
                    filterSector: 0,
                    filterGoal: 1
                  })
                }}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>
        </div>

        {/* <br /> */}
        <div style={{ height: 12 }} />

        {
          (trafficLightFull === true) &&
          <Row>
            <Col md="12">
              <TrafficLights
                goalData={goalData}
                filterYear={filterYear}
                height={350}
                popCallback={() => { this.setState({ trafficLightFull: false }) }}
                fullView
              />
            </Col>
          </Row>
        }

        {
          (mapFullView === true) &&
          <Row>
            <Col md="12">
              <MapViewCore
                height={525}
                popCallback={() => { this.setState({ mapFullView: false }) }}
                fullView
                filters={{
                  region: filterRegion,
                  parentRegion: filterRegionParent,
                  sector: filterSector,
                  institution: filterInstitution,
                  goal: filterGoal,
                  year: filterYear
                }}
              />
            </Col>
          </Row>
        }

        {
          (trafficLightFull === false && mapFullView === false) &&
          <Row>
            <Col md="6">

              <Row>
                <Col md="12">
                  {/* selected goal details ??? */}
                  <GoalDetails goal={filterGoal} />
                </Col>
              </Row>

              {/* <br /> */}
              <div style={{ height: 10 }} />

              <Row>
                <Col md="12">
                  {/* traffic lights */}
                  <TrafficLights
                    goalData={goalData}
                    filterYear={filterYear}
                    height={200}
                    popCallback={() => { this.setState({ trafficLightFull: true }) }}
                  />
                </Col>
              </Row>

            </Col>

            <Col md="6">

              <Row>
                <Col md="12">
                  <MapViewCore
                    height={420}
                    popCallback={() => { this.setState({ mapFullView: true }) }}
                    filters={{
                      region: filterRegion,
                      parentRegion: filterRegionParent,
                      sector: filterSector,
                      institution: filterInstitution,
                      goal: filterGoal,
                      year: filterYear
                    }}
                  />
                </Col>
              </Row>

            </Col>

          </Row>
        }

        {/* <div style={{
          marginTop: "15px",
          marginBottom: "15px",
          paddingTop: "15px",
          paddingBottom: "15px",
          borderTop: "1px solid gainsboro",
          borderBottom: "1px solid gainsboro"
        }}>
          <Row>

            <Col>
              <FundingIGFX data={goalDataUnfiltered} year={filterYear} />
            </Col>
            <Col>
              <PlansIGFX data={goalDataUnfiltered} year={filterYear} />
            </Col>
            <Col>
              <GovernmentsIGFX data={goalDataUnfiltered} year={filterYear} />
            </Col>
            <Col>
              <GHGReductionIGFX data={goalDataUnfiltered} year={filterYear} />
            </Col>
            <Col>
              <SectorsIGFX data={goalDataUnfiltered} year={filterYear} />
            </Col>
          </Row>
        </div> */}

        {/* <Row>
          <Col md="4">
            <SARVA_Preview />
          </Col>
          <Col md="5">
            <NCCRD_Preview />
          </Col>
          <Col md="3">
            <NDMC_Preview />
          </Col>
        </Row> */}

      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Home)