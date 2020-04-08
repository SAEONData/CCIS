'use strict'

import React from 'react'
import { connect } from 'react-redux'
import { Row, Col, Button, Input, Modal, ModalHeader, ModalBody, ModalFooter, Container } from 'mdbreact'
import TextInput from '../../../input/TextInput.jsx'
import { DEAGreen, DEAGreenDark, Red, Amber, Green } from '../../../../config/colours.js'
import { apiBaseURL, ccrdBaseURL, vmsBaseURL } from '../../../../../js/config/serviceURLs.js'
import SelectInput from '../../../input/SelectInput.jsx'
import TreeSelectInput from '../../../input/TreeSelectInput.jsx'
import OData from 'react-odata'
import buildQuery from 'odata-query'
import FileUpload from '../../../input/FileUpload.jsx'
import { metaKeywordsList } from '../../../../../data/metaKeywordsList.js'

//Ant.D
import Slider from 'antd/lib/slider'
import 'antd/lib/slider/style/css'

import gear from '../../../../../images/Icons/gear.png'
import checklist from '../../../../../images/Icons/checklist.png'
import { CustomFetch } from '../../../../globalFunctions.js';

const _gf = require('../../../../globalFunctions')
const _sf = require('./SharedFunctions.js')

const mapStateToProps = (state, props) => {
  let user = state.oidc.user
  return { user }
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

const defaultState = {
  editing: false,
  messageModal: false,
  message: "",
  title: "",
  goalStatus: "R",
  goalId: _gf.GetUID(),
  Q4_1: 1, //CapacityBuilding
  Q4_2: "", //DocumentLink
  Q4_3: false, //DedicatedFunding
  Q4_3_A: 1, //TotalBudget
  Q4_3_B: 1, //BudgetDuration
  Q4_3_C: 0, //FundingAgency
  Q4_3_D: 0, //PartneringDepartments
  Q4_4: 0, //Region
  Q4_5: "", //Institution
  Q4_6: 0, //Sector
  metaAddAuthorModal: false,
  tmpMetaAuthorName: "",
  tmpMetaAuthorEmail: "",
  tmpMetaAuthorInstitution: "",
  metaAuthors: [],
  metaDocTitle: "",
  metaKeywords: [],
  metaDocDescr: "",
  metaAgreement: false,
  metaUID: "",
  metaRegion: "",
  isDraft: false
}

class Goal4Contrib extends React.Component {

  constructor(props) {
    super(props);

    this.submit = this.submit.bind(this)
    this.reset = this.reset.bind(this)
    this.showMessage = this.showMessage.bind(this)
    this.assessGoalStatus = this.assessGoalStatus.bind(this)

    this.state = defaultState
  }

  componentDidMount() {
    this.props.updateNav(location.hash)
  }

  componentDidUpdate() {
    let { editGoalId } = this.props
    if (editGoalId) {
      this.getEditGoalData(editGoalId)
    }

    this.assessGoalStatus()
  }

  assessGoalStatus() {

    let { goalStatus, Q4_1, Q4_2 } = this.state
    let newGoalStatus = "R"
    let redPoints = 0
    let amberPoints = 0
    let greenPoints = 0

    //Check red conditions
    if (Q4_1 === 1) {
      redPoints += 1
    }
    
    if (Q4_2 === false) {
      redPoints += 1
    }

    //Check amber conditions
    if (Q4_1 === 2) {
      amberPoints += 1
    }

    if (Q4_2 === true) {
      amberPoints += 1
    }

    //Check green conditions
    if (Q4_1 === 3) {
      greenPoints += 1
    }

    if (Q4_2 === true) {
      greenPoints += 1
    }

    //Parse result to status colour    
    if (greenPoints > 0) {
      newGoalStatus = "G"
    }
    else if (amberPoints > 0) {
      newGoalStatus = "A"
    }
    else if (redPoints > 0) {
      newGoalStatus = "R"
    }

    //Update status
    if (newGoalStatus !== goalStatus) {
      this.setState({ goalStatus: newGoalStatus })
    }
  }

  async waitForMessageClosed() {

    while (this.state.messageModal === true) {
      await _gf.wait(250)
    }

    return true
  }

  async getEditGoalData(editGoalId) {

    this.props.setLoading(true)
    this.props.resetEdit()

    //Fetch goal details from server
    const query = buildQuery({
      filter: { Id: { eq: { type: 'guid', value: editGoalId.toString() } } },
      expand: "Questions"
    })

    try {
      let res = await CustomFetch(apiBaseURL + `Goals${query}`)
      res = await res.json()
      if (res.value && res.value.length > 0) {
        let data = res.value[0]
        this.setState({
          editing: true,
          goalId: editGoalId,
          Q4_1: parseInt(data.Questions.filter(x => x.Key === "CapacityBuilding")[0].Value),
          Q4_2: data.Questions.filter(x => x.Key === "DocumentLink")[0].Value,
          Q4_3: data.Questions.filter(x => x.Key === "DedicatedFunding")[0].Value === 'true',
          Q4_3_A: parseInt(data.Questions.filter(x => x.Key === "TotalBudget")[0].Value),
          Q4_3_B: parseInt(data.Questions.filter(x => x.Key === "BudgetDuration")[0].Value),
          Q4_3_C: parseInt(data.Questions.filter(x => x.Key === "FundingAgency")[0].Value),
          Q4_3_D: parseInt(data.Questions.filter(x => x.Key === "PartneringDepartments")[0].Value),
          Q4_4: parseInt(data.Questions.filter(x => x.Key === "Region")[0].Value),
          Q4_5: data.Questions.filter(x => x.Key === "Institution")[0].Value,
          Q4_6: parseInt(data.Questions.filter(x => x.Key === "Sector")[0].Value),
          metaAuthors: data.Questions.filter(x => x.Key === "DocumentAuthors")[0].Value.split("||"),
          metaDocTitle: data.Questions.filter(x => x.Key === "DocumentTitle")[0].Value,
          metaKeywords: data.Questions.filter(x => x.Key === "DocumentKeywords")[0].Value.split("||"),
          metaDocDescr: data.Questions.filter(x => x.Key === "DocumentDescription")[0].Value,
          metaAgreement: data.Questions.filter(x => x.Key === "DocumentAgreement")[0].Value === 'true',
          metaUID: data.Questions.filter(x => x.Key === "MetaDataUID")[0].Value,
          metaRegion: data.Questions.filter(x => x.Key === "RegionName")[0].Value,
          attachmentDetails: JSON.parse(data.Questions.filter(x => x.Key === "DocumentDetails")[0].Value),
          isDraft: data.Questions.filter(x => x.Key === "IsDraft")[0].Value === 'true'
        })
      }

      this.props.setLoading(false)
    }
    catch (ex) {
      this.props.setLoading(false)
      console.error(ex)
    }
  }

  async reset() {

    await this.waitForMessageClosed();

    this.setState({ ...defaultState, goalId: _gf.GetUID() })

    // setTimeout(() => {
    //   window.scroll({
    //     top: 180,
    //     left: 0,
    //     behavior: 'smooth'
    //   })
    // }, 100)
  }

  async submit() {

    let { goalId, goalStatus, Q4_1, Q4_2, Q4_3, Q4_3_A, Q4_3_B, Q4_3_C, Q4_3_D, Q4_4, Q4_5, Q4_6 } = this.state
    let { setLoading, user } = this.props

    setLoading(true)

    //Construct post body
    let goal = {
      Id: goalId,
      CreateUser: user.profile.UserId,
      Status: goalStatus,
      Type: 4,
      Questions: [
        { Key: "CapacityBuilding", Value: Q4_1.toString() },
        { Key: "DedicatedFunding", Value: Q4_3.toString() },
        { Key: "TotalBudget", Value: Q4_3_A.toString() },
        { Key: "BudgetDuration", Value: Q4_3_B.toString() },
        { Key: "FundingAgency", Value: Q4_3_C.toString() },
        { Key: "PartneringDepartments", Value: Q4_3_D.toString() },
        { Key: "Region", Value: Q4_4.toString() },
        { Key: "Institution", Value: Q4_5 },
        { Key: "Sector", Value: Q4_6.toString() },
        { Key: "DocumentLink", Value: Q4_2 },
        { Key: "DocumentAuthors", Value: metaAuthors.join("||") },
        { Key: "DocumentTitle", Value: metaDocTitle },
        { Key: "DocumentKeywords", Value: metaKeywords.join("||") },
        { Key: "DocumentDescription", Value: metaDocDescr },
        { Key: "DocumentAgreement", Value: metaAgreement.toString() },
        { Key: "MetaDataUID", Value: metaUID },
        // { Key: "IsDraft", Value: isDraft }
      ]
    }

    //Submit
    try {
      let res = await CustomFetch(apiBaseURL + 'Goals', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (user === null ? "" : user.access_token)
        },
        body: JSON.stringify(goal)
      })

      if (!res.ok) {
        //Get response body
        res = await res.json()
        throw new Error(res.error.message)
      }

      this.showMessage("Success", "Goal submitted successfully")
      await this.waitForMessageClosed()
      this.reset()
    }
    catch (ex) {
      console.error(ex)
      this.showMessage("An error occurred", ex.message)
    }
  }

  showMessage(title, message) {
    this.setState({
      title,
      message,
      messageModal: true
    })
  }

  render() {

    let { editing, goalStatus, goalId, Q4_2, Q4_1, Q4_3, Q4_3_A, Q4_3_B, Q4_3_C, Q4_3_D, Q4_4, Q4_5, Q4_6,
      metaAddAuthorModal, metaAuthors, tmpMetaAuthorName, tmpMetaAuthorEmail,
      tmpMetaAuthorInstitution, metaDocTitle, metaKeywords, metaDocDescr, metaAgreement, isDraft 
    } = this.state

    return (
      <>
        <Row style={{ marginLeft: "0px" }}>
          <Col md="12">
            <hr style={{ marginBottom: "15px", marginTop: "5px" }} />
          </Col>
          <Col md="1">
            <img src={gear} style={{ height: "40px", marginBottom: "10px", marginLeft: "0px", marginRight: "5px" }} />
          </Col>
          <Col md="11">
            <h5 style={{ marginTop: "8px" }}>
              Goal 4. Capacity development, education and awareness programmes (formal and informal) for
              climate change adaptation (e.g. informed by adaptation research and with tools to
              utilise data/outputs).
            </h5>
            <p style={{ marginTop: "20px", marginBottom: "2px" }}>
              <b>What is being monitored and evaluated:</b>
            </p>
            <ol style={{ marginLeft: "-15px" }}>
              <li>
                Number of capacity development programmes (including students, staff, researchers and
                institutions) addressing climate change adaptation;
              </li>
              <li>
                Coverage of adaptation research and training being undertaken and financed;
              </li>
              <li>
                Uptake of research outcomes and human capacity trained in adaptation;
              </li>
              <li>
                Collaboration and partnerships between sectors, businesses, provinces, municipalities
                and researchers; and
              </li>
              <li>
                Incorporation of climate change issues into school curriculum.
              </li>
            </ol>
            <p style={{ marginBottom: "3px" }}>
              <b>How it is being evaluated:</b>
            </p>
            <table style={{ width: "95%" }}>
              <tbody>
                <tr style={{ backgroundColor: Red }}>
                  <td style={{ color: "white", padding: "10px" }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>RED </b>
                      No capacity building programmes (including research), collaboration and partnerships
                      to address climate change adaptation and no incorporation into school curriculum.
                    </p>
                  </td>
                </tr>
                <tr style={{ backgroundColor: Amber }}>
                  <td style={{ color: "white", padding: "10px" }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>AMBER </b>
                      Attendance of capacity building programmes but no utilisation, collaboration and
                      partnerships to address climate change adaptation and no incorporation into school
                      curriculum.
                    </p>
                  </td>
                </tr>
                <tr style={{ backgroundColor: Green }}>
                  <td style={{ color: "white", padding: "10px" }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>GREEN </b>
                      Capacity building programmes (including research and utilisation), collaboration
                      and partnerships to address climate change adaptation, incorporation into school
                      curriculum, and utilisation to inform policy and decision-making.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
            <br />
          </Col>
          <Col md="12">
            <hr style={{ marginBottom: "20px", marginTop: "0px" }} />
          </Col>
        </Row>

        <Row style={{ marginLeft: "0px" }}>

          <Col md="1">
            <img src={checklist} style={{ height: "40px", marginBottom: "10px", marginLeft: "0px", marginRight: "5px" }} />
          </Col>
          <Col md="11">
            <h5 style={{ fontWeight: "bold", marginTop: "8px" }}>
              Goal 4 Assessment
            </h5>
            <br />

            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  4.1 Does your organisation participate in, support, or host climate change adaptation capacity building programmes?
                </label>
                <div style={{ marginLeft: "-22px", marginTop: "-10px" }}>
                  <Input
                    onClick={() => { this.setState({ Q4_1: 1 }) }}
                    checked={Q4_1 === 1 ? true : false}
                    label="No capacity building programmes (including research), collaboration and partnerships to address climate change adaptation and no incorporation into school curriculum."
                    type="radio"
                    id="radPrg1"
                  />
                  <Input
                    onClick={() => { this.setState({ Q4_1: 2 }) }}
                    checked={Q4_1 === 2 ? true : false}
                    label="Attendance of capacity building programmes but no utilisation, collaboration and partnerships to address climate change adaptation and no incorporation into school curriculum."
                    type="radio"
                    id="radPrg2"
                  />
                  <Input
                    onClick={() => { this.setState({ Q4_1: 3 }) }}
                    checked={Q4_1 === 3 ? true : false}
                    label="Capacity building programmes (including research and utilisation), collaboration and partnerships to address climate change adaptation, incorporation into school curriculum, and utilisation to inform policy and decision-making."
                    type="radio"
                    id="radPrg3"
                  />
                </div>
              </Col>
            </Row>
            <br />

            <Row style={{ marginBottom: "7px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                4.2  Add attachments to any evidence (this can be anything from a video, to a policy document or a flyer from an event):
                </label>
              </Col>
            </Row>
            <br />
            <Row style={{ marginBottom: "7px" }}>
              <Col md="4">
                <FileUpload
                  key={"fu_" + goalId}
                  style={{ marginTop: "-15px", marginBottom: "20px" }}
                  width="100%"
                  callback={(fileInfo) => {
                    this.setState({
                      Q4_2: fileInfo.Link,
                      attachmentDetails: {
                        size: fileInfo.Size,
                        name: fileInfo.FileName,
                        format: fileInfo.Format,
                        version: fileInfo.Version
                      }
                    })
                  }}
                  goalId={goalId}
                />
              </Col>
            </Row>

          
                <Row style={{ marginLeft: "0px" }}>
                  <Col md="12">
                    <label style={{ fontWeight: "bold" }}>
                      Who generated the evidence attached?
                    <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                    </label>
                    <br />
                    <Button
                      color=""
                      style={{ backgroundColor: DEAGreen, margin: "0px 0px 10px 0px" }}
                      onClick={() => { this.setState({ metaAddAuthorModal: true }) }}
                      size="sm"
                    >
                      Add author details
                  </Button>

                    {/* List authors */}
                    {_sf.listAuthors(metaAuthors,
                      updatedAuthors => this.setState({ metaAuthors: updatedAuthors }))}

                  </Col>
                </Row>
                <br />

                <Row style={{ marginLeft: "0px" }}>
                  <Col md="12">
                    <label style={{ fontWeight: "bold" }}>
                      What is the name of the file submitted?
                    <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                    </label>
                    <TextInput
                      width="95%"
                      value={metaDocTitle}
                      callback={(value) => {
                        this.setState({ metaDocTitle: value })
                      }}
                    />
                  </Col>
                </Row>

                <Row style={{ marginLeft: "0px" }}>
                  <Col md="8">
                    <label style={{ fontWeight: "bold" }}>
                      Please select all keywords that apply to the file:
                    <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                    </label>
                    <TreeSelectInput
                      multiple
                      defaultValue={[]}
                      data={metaKeywordsList}
                      transform={(item) => ({ id: item, text: item })}
                      value={metaKeywords}
                      callback={(value) => {
                        this.setState({ metaKeywords: value })
                      }}
                    />
                  </Col>
                </Row>
                <br />

                <Row style={{ marginLeft: "0px" }}>
                  <Col md="12">
                    <label style={{ fontWeight: "bold" }}>
                      The document you are uploading will be shared under a
                      &nbsp;
                    <a href="https://creativecommons.org/licenses/by/4.0/" target="blank"><u>Creative Commons CC-BY license</u></a>.
                    <br />
                      This allows the work to be shared in the public domain with no restrictions on its use,
                      provided it is cited correctly.
                    <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                    </label>
                    <div style={{
                      // marginLeft: "-15px",
                      // marginTop: "-15px",
                      border: "1px solid silver",
                      width: "270px",
                      backgroundColor: "#F0F0F0"
                    }}
                    >
                      <Input
                        id="metaAgreement"
                        label="I accept this agreement"
                        type="checkbox"
                        checked={metaAgreement}
                        onClick={() => { this.setState({ metaAgreement: !metaAgreement }) }}
                      />
                    </div>
                  </Col>
                </Row>
             
            
{/* 
            <br />

            <Row style={{ marginLeft: "0px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  Is this a final or draft document?
                </label>
              </Col>
            </Row>
            <Row style={{ marginLeft: "0px" }}>
              <Col md="12">
                <Button
                  onClick={() => { this.setState({ isDraft: true }) }}
                  color=""
                  style={{ fontSize: isDraft ? "13px" : "10px", marginLeft: "0px", backgroundColor: isDraft ? DEAGreen : "grey" }}
                  size="sm">
                  Draft
                </Button>
                <Button
                  onClick={() => { this.setState({ isDraft: false }) }}
                  color=""
                  style={{ fontSize: !isDraft ? "13px" : "10px", backgroundColor: !isDraft ? DEAGreen : "grey" }}
                  size="sm">
                  Final
                </Button>

              </Col>
            </Row> */}

            
            <br />

            
            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  4.3 Does your programme have dedicated funding for adaptation technologies (y/n)?
                </label>
                <br />
                <Button
                  onClick={() => { this.setState({ Q4_3: true }) }}
                  color=""
                  style={{ fontSize: Q4_3 ? "13px" : "10px", marginLeft: "0px", backgroundColor: Q4_3 ? DEAGreen : "grey" }}
                  size="sm">
                  YES
                </Button>
                <Button
                  onClick={() => { this.setState({ Q4_3: false }) }}
                  color=""
                  style={{ fontSize: !Q4_3 ? "13px" : "10px", backgroundColor: !Q4_3 ? DEAGreen : "grey" }}
                  size="sm">
                  NO
                </Button>
              </Col>
            </Row>
            <br />

            {
              Q4_3 === true &&
              <div>
                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="12">
                    <label style={{ fontWeight: "bold" }}>
                    What is the total budget for your programme?
                </label>
                    <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
                      <Row style={{ marginBottom: "-10px" }}>
                        <Col md="2" style={{ textAlign: "left" }}>
                          <a onClick={() => { this.setState({ Q4_3_A: 1 }) }}>0k - 10k</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "left" }}>
                          <a onClick={() => { this.setState({ Q4_3_A: 2 }) }}>10k - 100k</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "center" }}>
                          <a onClick={() => { this.setState({ Q4_3_A: 3 }) }}>100k - 1m</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "center" }}>
                          <a onClick={() => { this.setState({ Q4_3_A: 4 }) }}>1m - 10m</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "right" }}>
                          <a onClick={() => { this.setState({ Q4_3_A: 5 }) }}>10m - 100m</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "right" }}>
                          <a onClick={() => { this.setState({ Q4_3_A: 6 }) }}>> 100m</a>
                        </Col>
                      </Row>
                      <Slider
                        min={1}
                        max={6}
                        value={Q4_3_A}
                        style={{ marginLeft: "15px", marginRight: "15px" }}
                        onChange={(value) => { this.setState({ Q4_3_A: value }) }}
                      />
                    </div>
                  </Col>
                </Row>
                <br />

                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="5">
                    <label style={{ fontWeight: "bold" }}>
                    How long will the funding for the programme last?
                </label>
                    <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
                      <Row style={{ marginBottom: "-10px" }}>
                        <Col md="4" style={{ textAlign: "left" }}>
                          <a onClick={() => { this.setState({ Q4_3_B: 1 }) }}>0 - 5</a>
                        </Col>
                        <Col md="4" style={{ textAlign: "center" }}>
                          <a onClick={() => { this.setState({ Q4_3_B: 2 }) }}>5 - 10</a>
                        </Col>
                        <Col md="4" style={{ textAlign: "right" }}>
                          <a onClick={() => { this.setState({ Q4_3_B: 3 }) }}>> 10</a>
                        </Col>
                      </Row>
                      <Slider
                        min={1}
                        max={3}
                        value={Q4_3_B}
                        style={{ marginLeft: "15px", marginRight: "15px" }}
                        onChange={(value) => { this.setState({ Q4_3_B: value }) }}
                      />
                    </div>
                  </Col>
                </Row>
                <br />

                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="8">
                    <label style={{ fontWeight: "bold" }}>
                      Who is the funding agency for the programme?
                </label>

                    <OData
                      baseUrl={ccrdBaseURL + 'Funders'}
                      query={{
                        select: ['FunderId', 'FundingAgency'],
                        orderBy: ['FundingAgency']
                      }}>

                      {({ loading, error, data }) => {

                        let processedData = []

                        if (loading) {
                          processedData = [{ FunderId: "Loading...", FundingAgency: "Loading..." }]
                        }

                        if (error) {
                          console.error(error)
                        }

                        if (data) {
                          if (data.value && data.value.length > 0) {
                            processedData = data.value
                          }
                        }

                        return (
                          <TreeSelectInput
                            data={processedData}
                            transform={(item) => { return { id: item.FunderId, text: item.FundingAgency } }}
                            value={Q4_3_C}
                            callback={(value) => { this.setState({ Q4_3_C: value.id }) }}
                            allowClear={true}
                            placeHolder={"Select Funding Agency...  (Leave empty for 'None')"}
                          />
                        )
                      }}
                    </OData>
                  </Col>
                </Row>
                <br />

                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="8">
                    <label style={{ fontWeight: "bold" }}>
                      Are there any partnering departments/organisations that share the cost for the programme?
                </label>

                    <OData
                      baseUrl={vmsBaseURL + 'SAGovDepts'}>

                      {({ loading, error, data }) => {

                        let processedData = []

                        if (loading) {
                          processedData = [{ id: "Loading...", value: "Loading..." }]
                        }

                        if (error) {
                          console.error(error)
                        }

                        if (data) {
                          if (data.items && data.items.length > 0) {
                            processedData = data.items
                          }
                        }

                        return (
                          <TreeSelectInput
                            data={processedData}
                            transform={(item) => { return { id: item.id, text: item.value, children: item.children } }}
                            value={Q4_3_D}
                            callback={(value) => { this.setState({ Q4_3_D: value.id }) }}
                            allowClear={true}
                            placeHolder={"Select Departments/Organisations...  (Leave empty for 'None')"}
                          />
                        )
                      }}
                    </OData>

                  </Col>
                </Row>
                <br />
              </div>
            }

            <Row>
              <Col md="8">
                <label style={{ fontWeight: "bold" }}>
                  4.4 Select a region for your programme. If your organisation has programmes in multiple locations within the republic, please select the highest geographic level that applies. For example, for locations in multiple provinces select 'national', for locations in multiple district muncipalities in the same province, select the correct province, etc.
                </label>

                <OData
                  baseUrl={vmsBaseURL + 'Regions'}>

                  {({ loading, error, data }) => {

                    let processedData = []

                    if (loading) {
                      processedData = [{ id: "Loading...", value: "Loading..." }]
                    }

                    if (error) {
                      console.error(error)
                    }

                    if (data) {
                      if (data.items && data.items.length > 0) {
                        processedData = data.items
                      }
                    }

                    return (
                      <TreeSelectInput
                        data={processedData}
                        transform={(item) => { return { id: item.id, text: item.value, children: item.children } }}
                        value={Q4_4}
                        callback={(value) => { this.setState({ Q4_4: value.id }) }}
                        allowClear={true}
                        placeHolder={"Select Region...  (Leave empty for 'National')"}
                      />
                    )

                  }}
                </OData>
              </Col>
            </Row>
            <br />

            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  4.5 If your organisation is not a South African municipal, district, provincial, or national government entity, please specify the name of your organisation.
                </label>
                <TextInput
                  width="95%"
                  value={Q4_5}
                  callback={(value) => {
                    value = _gf.fixEmptyValue(value, "")
                    this.setState({ Q4_5: value })
                  }}
                />
              </Col>
            </Row>

            <Row>
              <Col md="8">
                <label style={{ fontWeight: "bold" }}>
                  4.6 Please select the sector your organisation falls under:
                </label>

                <OData
                  baseUrl={vmsBaseURL + 'sectors'}>

                  {({ loading, error, data }) => {

                    let processedData = []

                    if (loading) {
                      processedData = [{ id: "Loading...", value: "Loading..." }]
                    }

                    if (error) {
                      console.error(error)
                    }

                    if (data) {
                      if (data.items && data.items.length > 0) {
                        processedData = data.items
                      }
                    }

                    return (
                      <TreeSelectInput
                        data={processedData}
                        transform={(item) => { return { id: item.id, text: item.value, children: item.children } }}
                        value={Q4_6}
                        callback={(value) => { this.setState({ Q4_6: value.id }) }}
                        allowClear={true}
                        placeHolder={"Select Sector...  (Leave empty for 'Any')"}
                      />
                    )
                  }}
                </OData>
              </Col>
            </Row>
            <br />

            <Row>
              <Col md="4">
                <Button color="" style={{ marginLeft: "0px", backgroundColor: DEAGreen, color: "black", fontSize: "16px" }}
                  onClick={this.submit} >
                  <b>{editing === true ? "Update" : "Save"}</b>
                </Button>
              </Col>
            </Row>

            <Row style={{ marginTop: "15px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold", marginBottom: "0px" }}>
                  Based on your submission, your Goal 4 status is:
                </label>
                <br />
                <Button
                  size="sm"
                  color=""
                  style={{ backgroundColor: Red, marginLeft: "0px", marginRight: "0px", height: goalStatus === "R" ? "40px" : "35px", width: goalStatus === "R" ? "58px" : "40px", border: goalStatus === "R" ? "2px solid black" : "0px solid black" }}
                />
                <Button
                  size="sm"
                  color=""
                  style={{ backgroundColor: Amber, marginLeft: "0px", marginRight: "0px", height: goalStatus === "A" ? "40px" : "35px", width: goalStatus === "A" ? "58px" : "40px", border: goalStatus === "A" ? "2px solid black" : "0px solid black" }}
                />
                <Button
                  size="sm"
                  color=""
                  style={{ backgroundColor: Green, marginLeft: "0px", marginRight: "0px", height: goalStatus === "G" ? "40px" : "35px", width: goalStatus === "G" ? "58px" : "40px", border: goalStatus === "G" ? "2px solid black" : "0px solid black" }}
                />
              </Col>
            </Row>

          </Col>
        </Row>

        {/* Message modal */}
        <Container>
          <Modal isOpen={this.state.messageModal} toggle={() => { this.setState({ messageModal: false }) }} centered>
            <ModalHeader toggle={() => { this.setState({ messageModal: false }) }}>
              {this.state.title}
            </ModalHeader>
            <ModalBody>
              <div className="col-md-12" style={{ overflowY: "auto", maxHeight: "65vh" }}>
                {_gf.StringToHTML(this.state.message)}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                size="sm"
                style={{ width: "100px", backgroundColor: DEAGreen }}
                color="" onClick={() => this.setState({ messageModal: false })} >
                Close
              </Button>
            </ModalFooter>
          </Modal>
        </Container>
 {/* Add author modal */}
 <Modal isOpen={this.state.metaAddAuthorModal} toggle={() => { this.setState({ metaAddAuthorModal: false }) }} centered>
          <ModalHeader toggle={() => { this.setState({ metaAddAuthorModal: false }) }}>
            Add author details:
                </ModalHeader>
          <ModalBody>
            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  Name:
                        <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                </label>
                <TextInput
                  width="95%"
                  value={tmpMetaAuthorName}
                  callback={(value) => {
                    this.setState({ tmpMetaAuthorName: value }) // console.log(value)
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  Email:
                        <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                </label>
                <TextInput
                  width="95%"
                  value={tmpMetaAuthorEmail}
                  callback={(value) => {
                    this.setState({ tmpMetaAuthorEmail: value })
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  Institution:
                        <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                </label>
                <TextInput
                  width="95%"
                  value={tmpMetaAuthorInstitution}
                  callback={(value) => {
                    this.setState({ tmpMetaAuthorInstitution: value })
                  }}
                />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button
              disabled={_gf.isEmptyValue(tmpMetaAuthorName) || _gf.isEmptyValue(tmpMetaAuthorEmail) || _gf.isEmptyValue(tmpMetaAuthorInstitution)}
              size="sm"
              style={{ width: "100px", backgroundColor: DEAGreen }}
              color="" onClick={() => this.setState({
                metaAddAuthorModal: false,
                metaAuthors: [...metaAuthors, `${tmpMetaAuthorName}, ${tmpMetaAuthorEmail}, ${tmpMetaAuthorInstitution}`],
                tmpMetaAuthorName: "",
                tmpMetaAuthorEmail: "",
                tmpMetaAuthorInstitution: ""
              })}
            >
              Add
                  </Button>
            <Button
              size="sm"
              style={{ width: "100px", backgroundColor: DEAGreen }}
              color="" onClick={() => this.setState({
                metaAddAuthorModal: false,
                tmpMetaAuthorName: "",
                tmpMetaAuthorEmail: "",
                tmpMetaAuthorInstitution: ""
              })} >
              Cancel
                  </Button>
          </ModalFooter>
        </Modal>
      </>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Goal4Contrib)

// 'use strict'

// import React from 'react'
// import { connect } from 'react-redux'
// import { Row, Col, Button, Input, Modal, ModalHeader, ModalBody, ModalFooter, Container } from 'mdbreact'
// import TextInput from '../../../input/TextInput.jsx'
// import { DEAGreen, DEAGreenDark, Red, Amber, Green } from '../../../../config/colours.js'
// import { apiBaseURL, ccrdBaseURL, vmsBaseURL } from '../../../../../js/config/serviceURLs.js'
// import SelectInput from '../../../input/SelectInput.jsx'
// import TreeSelectInput from '../../../input/TreeSelectInput.jsx'
// import OData from 'react-odata'
// import buildQuery from 'odata-query'
// import FileUpload from '../../../input/FileUpload.jsx'

// //Ant.D
// import Slider from 'antd/lib/slider'
// import 'antd/lib/slider/style/css'

// import gear from '../../../../../images/Icons/gear.png'
// import checklist from '../../../../../images/Icons/checklist.png'
// import { CustomFetch } from '../../../../globalFunctions.js';

// const _gf = require('../../../../globalFunctions')

// const mapStateToProps = (state, props) => {
//   let user = state.oidc.user
//   return { user }
// }

// const mapDispatchToProps = (dispatch) => {
//   return {
//     updateNav: payload => {
//       dispatch({ type: "NAV", payload })
//     },
//     setLoading: payload => {
//       dispatch({ type: "SET_LOADING", payload })
//     }
//   }
// }

// const defaultState = {
//   editing: false,
//   messageModal: false,
//   message: "",
//   title: "",
//   goalStatus: "R",
//   goalId: _gf.GetUID(),
//   Q4_1: 1, //CapacityBuilding
//   Q4_2: false, //DedicatedFunding
//   Q4_2_1: "", //DocumentLink
//   Q4_2_A: 1, //TotalBudget
//   Q4_2_B: 1, //BudgetDuration
//   Q4_2_C: 0, //FundingAgency
//   Q4_2_D: 0, //PartneringDepartments
//   Q4_3: 0, //Region
//   Q4_4: "", //Institution
//   Q4_5: 0 //Sector
// }

// class Goal4Contrib extends React.Component {

//   constructor(props) {
//     super(props);

//     this.submit = this.submit.bind(this)
//     this.reset = this.reset.bind(this)
//     this.showMessage = this.showMessage.bind(this)
//     this.assessGoalStatus = this.assessGoalStatus.bind(this)

//     this.state = defaultState
//   }

//   componentDidMount() {
//     this.props.updateNav(location.hash)
//   }

//   componentDidUpdate() {
//     let { editGoalId } = this.props
//     if (editGoalId) {
//       this.getEditGoalData(editGoalId)
//     }

//     this.assessGoalStatus()
//   }

//   assessGoalStatus() {

//     let { goalStatus, Q4_1, Q4_2_1 } = this.state
//     let newGoalStatus = "R"
//     let redPoints = 0
//     let amberPoints = 0
//     let greenPoints = 0

//     //Check red conditions
//     if (Q4_1 === 1) {
//       redPoints += 1
//     }
    
//     if (Q4_2_1 === false) {
//       redPoints += 1
//     }

//     //Check amber conditions
//     if (Q4_1 === 2) {
//       amberPoints += 1
//     }

//     if (Q4_2_1 === true) {
//       amberPoints += 1
//     }

//     //Check green conditions
//     if (Q4_1 === 3) {
//       greenPoints += 1
//     }

//     if (Q4_2_1 === true) {
//       greenPoints += 1
//     }

//     //Parse result to status colour    
//     if (greenPoints > 0) {
//       newGoalStatus = "G"
//     }
//     else if (amberPoints > 0) {
//       newGoalStatus = "A"
//     }
//     else if (redPoints > 0) {
//       newGoalStatus = "R"
//     }

//     //Update status
//     if (newGoalStatus !== goalStatus) {
//       this.setState({ goalStatus: newGoalStatus })
//     }
//   }

//   async waitForMessageClosed() {

//     while (this.state.messageModal === true) {
//       await _gf.wait(250)
//     }

//     return true
//   }

//   async getEditGoalData(editGoalId) {

//     this.props.setLoading(true)
//     this.props.resetEdit()

//     //Fetch goal details from server
//     const query = buildQuery({
//       filter: { Id: { eq: { type: 'guid', value: editGoalId.toString() } } },
//       expand: "Questions"
//     })

//     try {
//       let res = await CustomFetch(apiBaseURL + `Goals${query}`)
//       res = await res.json()
//       if (res.value && res.value.length > 0) {
//         let data = res.value[0]
//         this.setState({
//           editing: true,
//           goalId: editGoalId,
//           Q4_1: parseInt(data.Questions.filter(x => x.Key === "CapacityBuilding")[0].Value),
//           Q4_2_1: data.Questions.filter(x => x.Key === "DocumentLink")[0].Value,
//           Q4_2: data.Questions.filter(x => x.Key === "DedicatedFunding")[0].Value === 'true',
//           Q4_2_A: parseInt(data.Questions.filter(x => x.Key === "TotalBudget")[0].Value),
//           Q4_2_B: parseInt(data.Questions.filter(x => x.Key === "BudgetDuration")[0].Value),
//           Q4_2_C: parseInt(data.Questions.filter(x => x.Key === "FundingAgency")[0].Value),
//           Q4_2_D: parseInt(data.Questions.filter(x => x.Key === "PartneringDepartments")[0].Value),
//           Q4_3: parseInt(data.Questions.filter(x => x.Key === "Region")[0].Value),
//           Q4_4: data.Questions.filter(x => x.Key === "Institution")[0].Value,
//           Q4_5: parseInt(data.Questions.filter(x => x.Key === "Sector")[0].Value),
//         })
//       }

//       this.props.setLoading(false)
//     }
//     catch (ex) {
//       this.props.setLoading(false)
//       console.error(ex)
//     }
//   }

//   async reset() {

//     await this.waitForMessageClosed();

//     this.setState({ ...defaultState, goalId: _gf.GetUID() })

//     // setTimeout(() => {
//     //   window.scroll({
//     //     top: 180,
//     //     left: 0,
//     //     behavior: 'smooth'
//     //   })
//     // }, 100)
//   }

//   async submit() {

//     let { goalId, goalStatus, Q4_1, Q4_2_1, Q4_2, Q4_2_A, Q4_2_B, Q4_2_C, Q4_2_D, Q4_3, Q4_4, Q4_5 } = this.state
//     let { setLoading, user } = this.props

//     setLoading(true)

//     //Construct post body
//     let goal = {
//       Id: goalId,
//       CreateUser: user.profile.UserId,
//       Status: goalStatus,
//       Type: 4,
//       Questions: [
//         { Key: "CapacityBuilding", Value: Q4_1.toString() },
//         { Key: "DedicatedFunding", Value: Q4_2.toString() },
//         { Key: "TotalBudget", Value: Q4_2_A.toString() },
//         { Key: "BudgetDuration", Value: Q4_2_B.toString() },
//         { Key: "FundingAgency", Value: Q4_2_C.toString() },
//         { Key: "PartneringDepartments", Value: Q4_2_D.toString() },
//         { Key: "Region", Value: Q4_3.toString() },
//         { Key: "Institution", Value: Q4_4 },
//         { Key: "Sector", Value: Q4_5.toString() },
//         { Key: "DocumentLink", Value: Q4_2_1 },
//         { Key: "DocumentAuthors", }
//       ]
//     }

//     //Submit
//     try {
//       let res = await CustomFetch(apiBaseURL + 'Goals', {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": "Bearer " + (user === null ? "" : user.access_token)
//         },
//         body: JSON.stringify(goal)
//       })

//       if (!res.ok) {
//         //Get response body
//         res = await res.json()
//         throw new Error(res.error.message)
//       }

//       setLoading(false)
//       this.showMessage("Success", "Goal submitted successfully")
//       await this.waitForMessageClosed()
//       this.reset()
//     }
//     catch (ex) {
//       setLoading(false)
//       console.error(ex)
//       this.showMessage("An error occurred", ex.message)
//     }
//   }

//   showMessage(title, message) {
//     this.setState({
//       title,
//       message,
//       messageModal: true
//     })
//   }

//   render() {

//     let { editing, goalStatus, goalId, Q4_2_1, Q4_1, Q4_2, Q4_2_A, Q4_2_B, Q4_2_C, Q4_2_D, Q4_3, Q4_4, Q4_5 } = this.state

//     return (
//       <>
//         <Row style={{ marginLeft: "0px" }}>
//           <Col md="12">
//             <hr style={{ marginBottom: "15px", marginTop: "5px" }} />
//           </Col>
//           <Col md="1">
//             <img src={gear} style={{ height: "40px", marginBottom: "10px", marginLeft: "0px", marginRight: "5px" }} />
//           </Col>
//           <Col md="11">
//             <h5 style={{ marginTop: "8px" }}>
//               Goal 4. Capacity development, education and awareness programmes (formal and informal) for
//               climate change adaptation (e.g. informed by adaptation research and with tools to
//               utilise data/outputs).
//             </h5>
//             <p style={{ marginTop: "20px", marginBottom: "2px" }}>
//               <b>What is being monitored and evaluated:</b>
//             </p>
//             <ol style={{ marginLeft: "-15px" }}>
//               <li>
//                 Number of capacity development programmes (including students, staff, researchers and
//                 institutions) addressing climate change adaptation;
//               </li>
//               <li>
//                 Coverage of adaptation research and training being undertaken and financed;
//               </li>
//               <li>
//                 Uptake of research outcomes and human capacity trained in adaptation;
//               </li>
//               <li>
//                 Collaboration and partnerships between sectors, businesses, provinces, municipalities
//                 and researchers; and
//               </li>
//               <li>
//                 Incorporation of climate change issues into school curriculum.
//               </li>
//             </ol>
//             <p style={{ marginBottom: "3px" }}>
//               <b>How it is being evaluated:</b>
//             </p>
//             <table style={{ width: "95%" }}>
//               <tbody>
//                 <tr style={{ backgroundColor: Red }}>
//                   <td style={{ color: "white", padding: "10px" }}>
//                     <p style={{ marginBottom: "0px" }}>
//                       <b>RED </b>
//                       No capacity building programmes (including research), collaboration and partnerships
//                       to address climate change adaptation and no incorporation into school curriculum.
//                     </p>
//                   </td>
//                 </tr>
//                 <tr style={{ backgroundColor: Amber }}>
//                   <td style={{ color: "white", padding: "10px" }}>
//                     <p style={{ marginBottom: "0px" }}>
//                       <b>AMBER </b>
//                       Attendance of capacity building programmes but no utilisation, collaboration and
//                       partnerships to address climate change adaptation and no incorporation into school
//                       curriculum.
//                     </p>
//                   </td>
//                 </tr>
//                 <tr style={{ backgroundColor: Green }}>
//                   <td style={{ color: "white", padding: "10px" }}>
//                     <p style={{ marginBottom: "0px" }}>
//                       <b>GREEN </b>
//                       Capacity building programmes (including research and utilisation), collaboration
//                       and partnerships to address climate change adaptation, incorporation into school
//                       curriculum, and utilisation to inform policy and decision-making.
//                     </p>
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//             <br />
//           </Col>
//           <Col md="12">
//             <hr style={{ marginBottom: "20px", marginTop: "0px" }} />
//           </Col>
//         </Row>

//         <Row style={{ marginLeft: "0px" }}>

//           <Col md="1">
//             <img src={checklist} style={{ height: "40px", marginBottom: "10px", marginLeft: "0px", marginRight: "5px" }} />
//           </Col>
//           <Col md="11">
//             <h5 style={{ fontWeight: "bold", marginTop: "8px" }}>
//               Goal 4 Assessment
//             </h5>
//             <br />

//             <Row>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   4.1 Does your organisation participate in, support, or host climate change adaptation capacity building programmes?
//                 </label>
//                 <div style={{ marginLeft: "-22px", marginTop: "-10px" }}>
//                   <Input
//                     onClick={() => { this.setState({ Q4_1: 1 }) }}
//                     checked={Q4_1 === 1 ? true : false}
//                     label="No capacity building programmes (including research), collaboration and partnerships to address climate change adaptation and no incorporation into school curriculum."
//                     type="radio"
//                     id="radPrg1"
//                   />
//                   <Input
//                     onClick={() => { this.setState({ Q4_1: 2 }) }}
//                     checked={Q4_1 === 2 ? true : false}
//                     label="Attendance of capacity building programmes but no utilisation, collaboration and partnerships to address climate change adaptation and no incorporation into school curriculum."
//                     type="radio"
//                     id="radPrg2"
//                   />
//                   <Input
//                     onClick={() => { this.setState({ Q4_1: 3 }) }}
//                     checked={Q4_1 === 3 ? true : false}
//                     label="Capacity building programmes (including research and utilisation), collaboration and partnerships to address climate change adaptation, incorporation into school curriculum, and utilisation to inform policy and decision-making."
//                     type="radio"
//                     id="radPrg3"
//                   />
//                 </div>
//               </Col>
//             </Row>
//             <br />

//             <Row style={{ marginBottom: "7px" }}>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   Add attachments to any evidence (this can be anything from a video, to a policy document or a flyer from an event):
//                 </label>
//               </Col>
//             </Row>
//             <br />
//             <Row style={{ marginBottom: "7px" }}>
//               <Col md="4">
//                 <FileUpload
//                   key={"fu_" + goalId}
//                   style={{ marginTop: "-15px", marginBottom: "20px" }}
//                   width="100%"
//                   callback={(fileInfo) => {
//                     this.setState({
//                       Q4_2_1: fileInfo.Link,
//                       attachmentDetails: {
//                         size: fileInfo.Size,
//                         name: fileInfo.FileName,
//                         format: fileInfo.Format,
//                         version: fileInfo.Version
//                       }
//                     })
//                   }}
//                   goalId={goalId}
//                 />
//               </Col>
//             </Row>

//             {
//              !_gf.isEmptyValue(Q4_2_1) &&
              
//               <div>
//                 <Row style={{ marginLeft: "0px" }}>
//                   <Col md="12">
//                     <label style={{ fontWeight: "bold" }}>
//                       Who generated the evidence attached?
//                     <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
//                     </label>
//                     <br />
//                     <Button
//                       color=""
//                       style={{ backgroundColor: DEAGreen, margin: "0px 0px 10px 0px" }}
//                       onClick={() => { this.setState({ metaAddAuthorModal: true }) }}
//                       size="sm"
//                     >
//                       Add author details
//                   </Button>

//                     {/* List authors */}
//                     {_sf.listAuthors(metaAuthors,
//                       updatedAuthors => this.setState({ metaAuthors: updatedAuthors }))}

//                   </Col>
//                 </Row>
//                 <br />

//                 <Row style={{ marginLeft: "0px" }}>
//                   <Col md="12">
//                     <label style={{ fontWeight: "bold" }}>
//                       What is the name of the file submitted?
//                     <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
//                     </label>
//                     <TextInput
//                       width="95%"
//                       value={metaDocTitle}
//                       callback={(value) => {
//                         this.setState({ metaDocTitle: value })
//                       }}
//                     />
//                   </Col>
//                 </Row>

//                 <Row style={{ marginLeft: "0px" }}>
//                   <Col md="8">
//                     <label style={{ fontWeight: "bold" }}>
//                       Please select all keywords that apply to the file:
//                     <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
//                     </label>
//                     <TreeSelectInput
//                       multiple
//                       defaultValue={[]}
//                       data={metaKeywordsList}
//                       transform={(item) => ({ id: item, text: item })}
//                       value={metaKeywords}
//                       callback={(value) => {
//                         this.setState({ metaKeywords: value })
//                       }}
//                     />
//                   </Col>
//                 </Row>
//                 <br />

//                 <Row style={{ marginLeft: "0px" }}>
//                   <Col md="12">
//                     <label style={{ fontWeight: "bold" }}>
//                       The document you are uploading will be shared under a
//                       &nbsp;
//                     <a href="https://creativecommons.org/licenses/by/4.0/" target="blank"><u>Creative Commons CC-BY license</u></a>.
//                     <br />
//                       This allows the work to be shared in the public domain with no restrictions on its use,
//                       provided it is cited correctly.
//                     <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
//                     </label>
//                     <div style={{
//                       // marginLeft: "-15px",
//                       // marginTop: "-15px",
//                       border: "1px solid silver",
//                       width: "270px",
//                       backgroundColor: "#F0F0F0"
//                     }}
//                     >
//                       <Input
//                         id="metaAgreement"
//                         label="I accept this agreement"
//                         type="checkbox"
//                         checked={metaAgreement}
//                         onClick={() => { this.setState({ metaAgreement: !metaAgreement }) }}
//                       />
//                     </div>
//                   </Col>
//                 </Row>
             
            

//             <br />

//             <Row style={{ marginLeft: "0px" }}>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   Is this a final or draft document?
//                 </label>
//               </Col>
//             </Row>
//             <Row style={{ marginLeft: "0px" }}>
//               <Col md="12">
//                 <Button
//                   onClick={() => { this.setState({ isDraft: true }) }}
//                   color=""
//                   style={{ fontSize: isDraft ? "13px" : "10px", marginLeft: "0px", backgroundColor: isDraft ? DEAGreen : "grey" }}
//                   size="sm">
//                   Draft
//                 </Button>
//                 <Button
//                   onClick={() => { this.setState({ isDraft: false }) }}
//                   color=""
//                   style={{ fontSize: !isDraft ? "13px" : "10px", backgroundColor: !isDraft ? DEAGreen : "grey" }}
//                   size="sm">
//                   Final
//                 </Button>

//               </Col>
//             </Row>
//             </div>
//             }
//             <br />

            
//             <Row>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   4.2 Does your programme have dedicated funding for adaptation technologies (y/n)?
//                 </label>
//                 <br />
//                 <Button
//                   onClick={() => { this.setState({ Q4_2: true }) }}
//                   color=""
//                   style={{ fontSize: Q4_2 ? "13px" : "10px", marginLeft: "0px", backgroundColor: Q4_2 ? DEAGreen : "grey" }}
//                   size="sm">
//                   YES
//                 </Button>
//                 <Button
//                   onClick={() => { this.setState({ Q4_2: false }) }}
//                   color=""
//                   style={{ fontSize: !Q4_2 ? "13px" : "10px", backgroundColor: !Q4_2 ? DEAGreen : "grey" }}
//                   size="sm">
//                   NO
//                 </Button>
//               </Col>
//             </Row>
//             <br />

//             {
//               Q4_2 === true &&
//               <div>
//                 <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
//                   <Col md="12">
//                     <label style={{ fontWeight: "bold" }}>
//                     What is the total budget for your programme?
//                 </label>
//                     <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
//                       <Row style={{ marginBottom: "-10px" }}>
//                         <Col md="2" style={{ textAlign: "left" }}>
//                           <a onClick={() => { this.setState({ Q4_2_A: 1 }) }}>0k - 10k</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "left" }}>
//                           <a onClick={() => { this.setState({ Q4_2_A: 2 }) }}>10k - 100k</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "center" }}>
//                           <a onClick={() => { this.setState({ Q4_2_A: 3 }) }}>100k - 1m</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "center" }}>
//                           <a onClick={() => { this.setState({ Q4_2_A: 4 }) }}>1m - 10m</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "right" }}>
//                           <a onClick={() => { this.setState({ Q4_2_A: 5 }) }}>10m - 100m</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "right" }}>
//                           <a onClick={() => { this.setState({ Q4_2_A: 6 }) }}>> 100m</a>
//                         </Col>
//                       </Row>
//                       <Slider
//                         min={1}
//                         max={6}
//                         value={Q4_2_A}
//                         style={{ marginLeft: "15px", marginRight: "15px" }}
//                         onChange={(value) => { this.setState({ Q4_2_A: value }) }}
//                       />
//                     </div>
//                   </Col>
//                 </Row>
//                 <br />

//                 <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
//                   <Col md="5">
//                     <label style={{ fontWeight: "bold" }}>
//                     How long will the funding for the programme last?
//                 </label>
//                     <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
//                       <Row style={{ marginBottom: "-10px" }}>
//                         <Col md="4" style={{ textAlign: "left" }}>
//                           <a onClick={() => { this.setState({ Q4_2_B: 1 }) }}>0 - 5</a>
//                         </Col>
//                         <Col md="4" style={{ textAlign: "center" }}>
//                           <a onClick={() => { this.setState({ Q4_2_B: 2 }) }}>5 - 10</a>
//                         </Col>
//                         <Col md="4" style={{ textAlign: "right" }}>
//                           <a onClick={() => { this.setState({ Q4_2_B: 3 }) }}>> 10</a>
//                         </Col>
//                       </Row>
//                       <Slider
//                         min={1}
//                         max={3}
//                         value={Q4_2_B}
//                         style={{ marginLeft: "15px", marginRight: "15px" }}
//                         onChange={(value) => { this.setState({ Q4_2_B: value }) }}
//                       />
//                     </div>
//                   </Col>
//                 </Row>
//                 <br />

//                 <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
//                   <Col md="8">
//                     <label style={{ fontWeight: "bold" }}>
//                       Who is the funding agency for the programme?
//                 </label>

//                     <OData
//                       baseUrl={ccrdBaseURL + 'Funders'}
//                       query={{
//                         select: ['FunderId', 'FundingAgency'],
//                         orderBy: ['FundingAgency']
//                       }}>

//                       {({ loading, error, data }) => {

//                         let processedData = []

//                         if (loading) {
//                           processedData = [{ FunderId: "Loading...", FundingAgency: "Loading..." }]
//                         }

//                         if (error) {
//                           console.error(error)
//                         }

//                         if (data) {
//                           if (data.value && data.value.length > 0) {
//                             processedData = data.value
//                           }
//                         }

//                         return (
//                           <TreeSelectInput
//                             data={processedData}
//                             transform={(item) => { return { id: item.FunderId, text: item.FundingAgency } }}
//                             value={Q4_2_C}
//                             callback={(value) => { this.setState({ Q4_2_C: value.id }) }}
//                             allowClear={true}
//                             placeHolder={"Select Funding Agency...  (Leave empty for 'None')"}
//                           />
//                         )
//                       }}
//                     </OData>
//                   </Col>
//                 </Row>
//                 <br />

//                 <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
//                   <Col md="8">
//                     <label style={{ fontWeight: "bold" }}>
//                       Are there any partnering departments/organisations that share the cost for the programme?
//                 </label>

//                     <OData
//                       baseUrl={vmsBaseURL + 'SAGovDepts'}>

//                       {({ loading, error, data }) => {

//                         let processedData = []

//                         if (loading) {
//                           processedData = [{ id: "Loading...", value: "Loading..." }]
//                         }

//                         if (error) {
//                           console.error(error)
//                         }

//                         if (data) {
//                           if (data.items && data.items.length > 0) {
//                             processedData = data.items
//                           }
//                         }

//                         return (
//                           <TreeSelectInput
//                             data={processedData}
//                             transform={(item) => { return { id: item.id, text: item.value, children: item.children } }}
//                             value={Q4_2_D}
//                             callback={(value) => { this.setState({ Q4_2_D: value.id }) }}
//                             allowClear={true}
//                             placeHolder={"Select Departments/Organisations...  (Leave empty for 'None')"}
//                           />
//                         )
//                       }}
//                     </OData>

//                   </Col>
//                 </Row>
//                 <br />
//               </div>
//             }

//             <Row>
//               <Col md="8">
//                 <label style={{ fontWeight: "bold" }}>
//                   4.3 Select a region for your programme. If your organisation has programmes in multiple locations within the republic, please select the highest geographic level that applies. For example, for locations in multiple provinces select 'national', for locations in multiple district muncipalities in the same province, select the correct province, etc.
//                 </label>

//                 <OData
//                   baseUrl={vmsBaseURL + 'Regions'}>

//                   {({ loading, error, data }) => {

//                     let processedData = []

//                     if (loading) {
//                       processedData = [{ id: "Loading...", value: "Loading..." }]
//                     }

//                     if (error) {
//                       console.error(error)
//                     }

//                     if (data) {
//                       if (data.items && data.items.length > 0) {
//                         processedData = data.items
//                       }
//                     }

//                     return (
//                       <TreeSelectInput
//                         data={processedData}
//                         transform={(item) => { return { id: item.id, text: item.value, children: item.children } }}
//                         value={Q4_3}
//                         callback={(value) => { this.setState({ Q4_3: value.id }) }}
//                         allowClear={true}
//                         placeHolder={"Select Region...  (Leave empty for 'National')"}
//                       />
//                     )

//                   }}
//                 </OData>
//               </Col>
//             </Row>
//             <br />

//             <Row>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   4.4 If your organisation is not a South African municipal, district, provincial, or national government entity, please specify the name of your organisation.
//                 </label>
//                 <TextInput
//                   width="95%"
//                   value={Q4_4}
//                   callback={(value) => {
//                     value = _gf.fixEmptyValue(value, "")
//                     this.setState({ Q4_4: value })
//                   }}
//                 />
//               </Col>
//             </Row>

//             <Row>
//               <Col md="8">
//                 <label style={{ fontWeight: "bold" }}>
//                   4.5 Please select the sector your organisation falls under:
//                 </label>

//                 <OData
//                   baseUrl={vmsBaseURL + 'sectors'}>

//                   {({ loading, error, data }) => {

//                     let processedData = []

//                     if (loading) {
//                       processedData = [{ id: "Loading...", value: "Loading..." }]
//                     }

//                     if (error) {
//                       console.error(error)
//                     }

//                     if (data) {
//                       if (data.items && data.items.length > 0) {
//                         processedData = data.items
//                       }
//                     }

//                     return (
//                       <TreeSelectInput
//                         data={processedData}
//                         transform={(item) => { return { id: item.id, text: item.value, children: item.children } }}
//                         value={Q4_5}
//                         callback={(value) => { this.setState({ Q4_5: value.id }) }}
//                         allowClear={true}
//                         placeHolder={"Select Sector...  (Leave empty for 'Any')"}
//                       />
//                     )
//                   }}
//                 </OData>
//               </Col>
//             </Row>
//             <br />

//             <Row>
//               <Col md="4">
//                 <Button color="" style={{ marginLeft: "0px", backgroundColor: DEAGreen, color: "black", fontSize: "16px" }}
//                   onClick={this.submit} >
//                   <b>{editing === true ? "Update" : "Save"}</b>
//                 </Button>
//               </Col>
//             </Row>

//             <Row style={{ marginTop: "15px" }}>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold", marginBottom: "0px" }}>
//                   Based on your submission, your Goal 4 status is:
//                 </label>
//                 <br />
//                 <Button
//                   size="sm"
//                   color=""
//                   style={{ backgroundColor: Red, marginLeft: "0px", marginRight: "0px", height: goalStatus === "R" ? "40px" : "35px", width: goalStatus === "R" ? "58px" : "40px", border: goalStatus === "R" ? "2px solid black" : "0px solid black" }}
//                 />
//                 <Button
//                   size="sm"
//                   color=""
//                   style={{ backgroundColor: Amber, marginLeft: "0px", marginRight: "0px", height: goalStatus === "A" ? "40px" : "35px", width: goalStatus === "A" ? "58px" : "40px", border: goalStatus === "A" ? "2px solid black" : "0px solid black" }}
//                 />
//                 <Button
//                   size="sm"
//                   color=""
//                   style={{ backgroundColor: Green, marginLeft: "0px", marginRight: "0px", height: goalStatus === "G" ? "40px" : "35px", width: goalStatus === "G" ? "58px" : "40px", border: goalStatus === "G" ? "2px solid black" : "0px solid black" }}
//                 />
//               </Col>
//             </Row>

//           </Col>
//         </Row>

//         {/* Message modal */}
//         <Container>
//           <Modal isOpen={this.state.messageModal} toggle={() => { this.setState({ messageModal: false }) }} centered>
//             <ModalHeader toggle={() => { this.setState({ messageModal: false }) }}>
//               {this.state.title}
//             </ModalHeader>
//             <ModalBody>
//               <div className="col-md-12" style={{ overflowY: "auto", maxHeight: "65vh" }}>
//                 {_gf.StringToHTML(this.state.message)}
//               </div>
//             </ModalBody>
//             <ModalFooter>
//               <Button
//                 size="sm"
//                 style={{ width: "100px", backgroundColor: DEAGreen }}
//                 color="" onClick={() => this.setState({ messageModal: false })} >
//                 Close
//               </Button>
//             </ModalFooter>
//           </Modal>
//         </Container>

//       </>
//     )
//   }
// }

// export default connect(mapStateToProps, mapDispatchToProps)(Goal4Contrib)