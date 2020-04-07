'use strict'

import React from 'react'
import { connect } from 'react-redux'
import { Row, Col, Button, Input, Modal, ModalHeader, ModalBody, ModalFooter, Container } from 'mdbreact'
import TextInput from '../../../input/TextInput.jsx'
import { DEAGreen, DEAGreenDark, Red, Amber, Green } from '../../../../config/colours.js'
import { apiBaseURL, ccrdBaseURL, vmsBaseURL, metadataServiceURL } from '../../../../../js/config/serviceURLs.js'
import SelectInput from '../../../input/SelectInput.jsx'
import TreeSelectInput from '../../../input/TreeSelectInput.jsx'
import OData from 'react-odata'
import buildQuery from 'odata-query'
import FileUpload from '../../../input/FileUpload.jsx'
import { metaDataCredentials } from '../../../../../js/secrets.js'
import TextAreaInput from '../../../input/TextAreaInput.jsx'


//Ant.D
import Slider from 'antd/lib/slider'
import 'antd/lib/slider/style/css'

import gear from '../../../../../images/Icons/gear.png'
import checklist from '../../../../../images/Icons/checklist.png'
import { CustomFetch } from '../../../../globalFunctions.js';
import moment from 'moment'

const _gf = require('../../../../globalFunctions')
const _sf = require('./SharedFunctions.js')
const basic = require('basic-authorization-header')

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
  Q3_1: 1, //DisseminationUtilisation
  Q3_2: 1, //MonitoringForcasting
  Q3_3: "", //DocumentLink
  Q3_4: false, //DedicatedFunding
  Q3_4_A: 1, //TotalBudget
  Q3_4_B: 1, //BudgetDuration
  Q3_4_C: 0, //FundingAgency
  Q3_4_D: 0, //PartneringDepartments
  Q3_5: 0, //Region
  Q3_6: "", //Institution
  Q3_7: 0, //Sector
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
  attachmentDetails: { size: 0, name: "", format: "", version: 0 }, //JSON
  isDraft: false
}

class Goal3Contrib extends React.Component {

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

    let { goalStatus, Q3_1, Q3_2, Q3_3 } = this.state
    let newGoalStatus = "R"
    let redPoints = 0
    let amberPoints = 0
    let greenPoints = 0

    //Check red conditions
    if (Q3_1 === 1) {
      redPoints += 1
    }
    if (Q3_2 === 1) {
      redPoints += 1
    }
    if (Q3_3 === false) {
      redPoints += 1
    }
    //Check amber conditions
    if (Q3_1 === 2) {
      amberPoints += 1
    }
    if (Q3_2 === 2) {
      amberPoints += 1
    }
    if (Q3_3 === true) {
      amberPoints += 1
    }

    //Check green conditions
    if (Q3_1 === 3) {
      greenPoints += 1
    }
    if (Q3_2 === 3) {
      greenPoints += 1
    }
    if (Q3_3 === true) {
      greenPoints += 1
    }

    //Parse result to status colour    
    if (greenPoints === 2) {
      newGoalStatus = "G"
    }
    else if (redPoints <= 1 || amberPoints > 0) {
      newGoalStatus = "A"
    }
    else if (redPoints >= 2) {
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
          Q3_1: parseInt(data.Questions.filter(x => x.Key === "DisseminationUtilisation")[0].Value),
          Q3_2: parseInt(data.Questions.filter(x => x.Key === "MonitoringForcasting")[0].Value),
          Q3_3: data.Questions.filter(x => x.Key === "DocumentLink")[0].Value,
          Q3_4: data.Questions.filter(x => x.Key === "DedicatedFunding")[0].Value === 'true',
          Q3_4_A: parseInt(data.Questions.filter(x => x.Key === "TotalBudget")[0].Value),
          Q3_4_B: parseInt(data.Questions.filter(x => x.Key === "BudgetDuration")[0].Value),
          Q3_4_C: parseInt(data.Questions.filter(x => x.Key === "FundingAgency")[0].Value),
          Q3_4_D: parseInt(data.Questions.filter(x => x.Key === "PartneringDepartments")[0].Value),
          Q3_5: parseInt(data.Questions.filter(x => x.Key === "Region")[0].Value),
          Q3_6: data.Questions.filter(x => x.Key === "Institution")[0].Value,
          Q3_7: parseInt(data.Questions.filter(x => x.Key === "Sector")[0].Value),
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

    let { Q3_3 } = this.state
    let { setLoading } = this.props
    setLoading(true)

    let validated = this.validate()

    if (validated) {

      let metaUID = ""

      if (Q3_3 === true) {
        metaUID = await this.generateMetaData()
      }
      if (metaUID !== null) {
        await this.saveGoal(metaUID)
      }
    }

    setLoading(false)
  }

  validate() {
    let { Q3_3, metaDocTitle, metaKeywords, metaDocDescr, metaAgreement, metaAuthors } = this.state

    if (Q3_3 === true) {

      if (_gf.isEmptyValue(Q3_3)) {
        this.showMessage("Required", "Document attachment required - please attach a document.")
        return false
      }

      if (metaAuthors.length === 0) {
        this.showMessage("Required", "Document author(s) required - please add at least one author.")
      }
      if (_gf.isEmptyValue(metaDocTitle)) {
        this.showMessage("Required", "Document title required - please provide a title for your document.")
        return false
      }

      if (metaKeywords.length === 0) {
        this.showMessage("Required", "Document keywords required - please add at least one keyword.")
        return false
      }

      if (_gf.isEmptyValue(metaDocDescr)) {
        this.showMessage("Required", "Document description required - please provide a short abstract description of your document.")
        return false
      }

      if (metaAgreement === false) {
        this.showMessage("Required", "Licence agreement required - please accept the licence agreement.")
        return false
      }
    }

    return true
  }

  async saveGoal(metaUID) {

    let {
      goalId, goalStatus, Q3_1, Q3_2, Q3_4, Q3_4_A, Q3_4_B, Q3_4_C,
      Q3_4_D, Q3_5, Q3_6, Q3_7, Q3_3, attachmentDetails,
      metaKeywords, isDraft, metaDocDescr, metaDocTitle, metaAuthors, metaAgreement, metaRegion
    } = this.state

    let { user } = this.props

    //Construct post body
    let goal = {
      Id: goalId,
      CreateUser: user.profile.UserId,
      Status: goalStatus,
      Type: 3,
      Questions: [
        { Key: "DisseminationUtilisation", Value: Q3_1.toString() },
        { Key: "MonitoringForcasting", Value: Q3_2.toString() },
        { Key: "DedicatedFunding", Value: Q3_4.toString() },
        { Key: "TotalBudget", Value: Q3_4_A.toString() },
        { Key: "BudgetDuration", Value: Q3_4_B.toString() },
        { Key: "FundingAgency", Value: Q3_4_C.toString() },
        { Key: "PartneringDepartments", Value: Q3_4_D.toString() },
        { Key: "Region", Value: Q3_5.toString() },
        { Key: "Institution", Value: Q3_6 },
        { Key: "Sector", Value: Q3_7.toString() },
        { Key: "DocumentLink", Value: Q3_3 },
        { Key: "DocumentDetails", Value: JSON.stringify(attachmentDetails) },
        { Key: "DocumentAuthors", Value: metaAuthors.join("||") },
        { Key: "DocumentTitle", Value: metaDocTitle },
        { Key: "DocumentKeywords", Value: metaKeywords.join("||") },
        { Key: "DocumentDescription", Value: metaDocDescr },
        { Key: "DocumentAgreement", Value: metaAgreement.toString() },
        { Key: "RegionName", Value: metaRegion.toString() },
        { Key: "MetaDataUID", Value: metaUID },
        { Key: "IsDraft", Value: isDraft }

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
      setLoading(false)
      this.showMessage("Success", "Goal submitted successfully")
      await this.waitForMessageClosed()
      this.reset()
    }
    catch (ex) {
      setLoading(false)
      console.error(ex)
      this.showMessage("An error occurred", ex.message)
    }
  }

  async generateMetaData() {

    let {
      goalId, Q3_3, metaAuthors, metaDocTitle, metaKeywords,
      metaDocDescr, attachmentDetails, metaUID, metaRegion
    } = this.state

    //Get creators
    let creators = []
    metaAuthors.map(auth => {
      let authSplit = auth.split(", ")
      if (authSplit.length === 3) {
        creators.push({
          creatorName: authSplit[0].trim(),
          affiliation: `Organisation: ${authSplit[2].trim()}; e-Mail Address: ${authSplit[1].trim()}`
        })
      }
    })

    //Get subjects
    let subjects = []
    metaKeywords.map(keywrd => {
      subjects.push({
        subject: keywrd,
        subjectScheme: "",
        schemeURI: ""
      })
    })

    // get resourcetype
    let resourceType = ""
    let resTypeIndex = attachmentDetails.name.lastIndexOf(".")
    if (resTypeIndex > -1) {
      resourceType = attachmentDetails.name.substring(resTypeIndex + 1, attachmentDetails.name.length)
    }

    // get related identifiers
    let relatedIdentifiers = []
    if (!_gf.isEmptyValue(metaUID)) {
      relatedIdentifiers = [
        {
          relatedIdentifier: metaUID, //UID of previous metadata record
          relatedIdentifierType: "URL",
          relationType: "isPreviousVersionOf"
        }
      ]
    }

    // construct post body
    let jsonData = {
      xsiSchema: "http://datacite.org/schema/kernel-3",
      publisher: 'Department of Environmental Affairs',
      publicationYear: new Date().getFullYear().toString(),
      language: 'eng',
      titles: [
        {
          titleType: "",
          title: metaDocTitle
        }
      ],
      // doc abstract
      description: [
        {
          descriptionType: 'Abstract',
          description: metaDocDescr
        }
      ],
      // doc type
      resourceType: {
        resourceTypeGeneral: 'Dataset', // selected doc format (eg text)
        resourceType: resourceType.toUpperCase() // file extention (eg pdf)
      },
      // format of extracted media (eg pdf)
      formats: [
        {
          format: attachmentDetails.format
        }
      ],
      // keywords
      subjects: subjects,
      // region
      geoLocations: [
        { geoLocationPlace: metaRegion }
      ],
      relatedIdentifiers: relatedIdentifiers,
      alternateIdentifiers: [
        {
          alternateIdentifier: goalId,
          alternateIdentifierType: "UID"
        }
      ],
      //authors
      creators: creators,
      dates: [
        {
          date: moment().format("YYYY-MM-DD"), // date of doc upload
          dateType: "Submitted",
          dateInformation: "Document last update date"
        }
      ],
      rights: [
        {
          rights: "Attributio 4.0 International (CC BY 4.0)",
          rightsURI: "https://creativecommons.org/licenses/by/4.0/"
        }
      ],
      // file size in bytes
      sizes: [
        {
          size: `${attachmentDetails.size} B`
        }
      ],
      // file version number
      version: attachmentDetails.version.toString(),
      additionalFileds: {
        onlineResources: [
          {
            func: "download",
            desc: attachmentDetails.name,
            href: Q3_3,
            format: resourceType.toUpperCase()
          }
        ]
      },
      // required
      bounds: []
    }

    try {
      let res = await CustomFetch(metadataServiceURL, {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': basic(metaDataCredentials.username, metaDataCredentials.password)
        },
        body: new URLSearchParams({
          metadataType: 'DataCite',
          jsonData: JSON.stringify(jsonData)
        }).toString()
      })

      // get status
      let status = res.ok

      // get response body
      res = await res.json()

      if (!status) {
        throw new Error(res.error.message)
      }
      else if (res.status !== "success") {
        throw new Error(`\nLog:\n${res.log.join("\n")}`)
      }

      //Process result
      return res.url
    }
    catch (ex) {
      console.error("Unable to create meta-data record.\n", ex)
      this.showMessage("Meta-data creation failed", "Unable to create meta-data record. (See log for details)")

      return null
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

    let { editing, goalStatus, goalId, metaAuthors, metaAddAuthorModal, metaAgreement, isDraft, metaKeywords, metaKeywordsList,
      metaDocDescr, metaDocTitle, tmpMetaAuthorEmail, tmpMetaAuthorInstitution, tmpMetaAuthorName, TextAreaInput, attachmentDetails,
      Q3_1, Q3_2, Q3_3, Q3_4, Q3_4_A, Q3_4_B, Q3_4_C, Q3_4_D, Q3_5, Q3_6, Q3_7
    } = this.state

    let { user } = this.props


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
              Goal 3. Accurate climate information (e.g. historical trend data, seasonal predictions,
              future projections, and early warning of extreme weather and other climate-related events)
              provided by existing and new monitoring and forecasting facilities/networks (including their
              maintenance and enhancement) to inform adaptation planning and disaster risk reduction.
            </h5>
            <p style={{ marginTop: "20px", marginBottom: "2px" }}>
              <b>What is being monitored and evaluated:</b>
            </p>
            <ol style={{ marginLeft: "-15px" }}>
              <li>
                Historical climate trends;
              </li>
              <li>
                Fine-scale projections, forecasts (seasonal to inter-annual and intra-seasonal variability)
                and early warning systems for provincial and municipal use;
              </li>
              <li>
                Dissemination and communication platforms for weather and climate-related events
                (e.g. SMS and media);
              </li>
              <li>
                Utilisation of data/information products by end-users; and
              </li>
              <li>
                Maintenance and enhancements of monitoring and forecasting facilities/networks.
              </li>
            </ol>
            <p style={{ marginBottom: "5px" }}>
              <b>How it is being evaluated:</b>
            </p>
            <table style={{ width: "95%", marginLeft: "-30px", marginBottom: "-15px" }}>
              <tbody>
                <tr>
                  <td width="30px">
                    <b>3.1</b>
                  </td>
                  <td style={{ color: "white", padding: "10px", backgroundColor: Red }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>RED </b>
                      No dissemination and utilisation of weather and climate-related information.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td width="30px"></td>
                  <td style={{ color: "white", padding: "10px", backgroundColor: Amber }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>AMBER </b>
                      Dissemination but no utilisation of weather and climate-related information.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td width="30px"></td>
                  <td style={{ color: "white", padding: "10px", backgroundColor: Green }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>GREEN </b>
                      Dissemination and utilisation of weather and climate-related information at
                      provincial, municipal and community levels.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
            <br />
            <table style={{ width: "95%", marginLeft: "-30px" }}>
              <tbody>
                <tr>
                  <td width="30px">
                    <b>3.2</b>
                  </td>
                  <td style={{ color: "white", padding: "10px", backgroundColor: Red }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>RED </b>
                      Lack of monitoring and forecasting facilities/networks.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td width="30px"></td>
                  <td style={{ color: "white", padding: "10px", backgroundColor: Amber }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>AMBER </b>
                      Monitoring facilities/networks exist but are not well-maintained or enhanced.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td width="30px"></td>
                  <td style={{ color: "white", padding: "10px", backgroundColor: Green }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>GREEN </b>
                      Monitoring facilities/networks exist and are maintained and enhanced.
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
              Goal 3 Assessment
            </h5>
            <br />

            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  3.1 Does your organisation participate in dissemination and/or utilisation of climate change information?
                </label>
                <div style={{ marginLeft: "-22px", marginTop: "-10px" }}>
                  <Input
                    onClick={() => { this.setState({ Q3_1: 1 }) }}
                    checked={Q3_1 === 1 ? true : false}
                    label="No dissemination and utilisation of weather and climate-related information."
                    type="radio"
                    id="radDiss1"
                  />
                  <Input
                    onClick={() => { this.setState({ Q3_1: 2 }) }}
                    checked={Q3_1 === 2 ? true : false}
                    label="Dissemination but no utilisation of weather and climate-related information."
                    type="radio"
                    id="radDiss2"
                  />
                  <Input
                    onClick={() => { this.setState({ Q3_1: 3 }) }}
                    checked={Q3_1 === 3 ? true : false}
                    label="Utilisation of weather and climate-related information at provincial, municipal and community levels."
                    type="radio"
                    id="radDiss3"
                  />
                </div>
              </Col>
            </Row>
            <br />

            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  3.2 Does your organisation have access to data from or maintain monitoring and forecasting facilities/networks?
                </label>
                <div style={{ marginLeft: "-22px", marginTop: "-10px" }}>
                  <Input
                    onClick={() => { this.setState({ Q3_2: 1 }) }}
                    checked={Q3_2 === 1 ? true : false}
                    label="No monitoring and forecasting facilities/networks."
                    type="radio"
                    id="radMon1"
                  />
                  <Input
                    onClick={() => { this.setState({ Q3_2: 2 }) }}
                    checked={Q3_2 === 2 ? true : false}
                    label="Monitoring facilities/networks exist but are not well-maintained or enhanced."
                    type="radio"
                    id="radMon2"
                  />
                  <Input
                    onClick={() => { this.setState({ Q3_2: 3 }) }}
                    checked={Q3_2 === 3 ? true : false}
                    label="Monitoring facilities/networks exist and are maintained and enhanced."
                    type="radio"
                    id="radMon3"
                  />
                </div>
              </Col>
            </Row>
            <br />
            <Row style={{ marginBottom: "7px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                3.3 Add attachments to any evidence (this can be anything from a video, to a policy document or a flyer from an event):
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
                      Q3_3: fileInfo.Link,
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
                      Who wrote the document?
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
                      What is the title of the document?
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
                      Please select all keywords that apply to the document:
                    <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                    </label>
                    <TreeSelectInput
                      allowClear
                      multiple
                      initialValue={''}
                      data={metaKeywordsList}
                      transform={(item) => ({ id: item, text: item })}
                      value={metaKeywords || ''}
                      placeholder='select'
                      callback={(value) => {
                        this.setState({ metaKeywords: value || ''})
                      }}
                    />
                  </Col>
                </Row>
                <br />
{/* 
                <Row style={{ marginLeft: "0px" }}>
                  <Col md="12">
                    <label style={{ fontWeight: "bold" }}>
                      Please include an abstract or description for the document:
                    <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                    </label>
                    <TextAreaInput
                      width="95%"
                      value={metaDocDescr}
                      callback={(value) => {
                        this.setState({ metaDocDescr: value })
                      }}
                      readOnly={true}
                    />
                  </Col>
                </Row>
                <br /> */}
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
                </Row>
             
            <br />

            <Row style={{ marginBottom: "2px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  3.4 Does your climate change unit have dedicated funding (y/n)?
                </label>
                <br />
                <Button
                  onClick={() => { this.setState({ Q3_4: true }) }}
                  color=""
                  style={{ fontSize: Q3_4 ? "13px" : "10px", marginLeft: "0px", backgroundColor: Q3_4 ? DEAGreen : "grey" }}
                  size="sm">
                  YES
                </Button>
                <Button
                  onClick={() => { this.setState({ Q3_4: false }) }}
                  color=""
                  style={{ fontSize: !Q3_4 ? "13px" : "10px", backgroundColor: !Q3_4 ? DEAGreen : "grey" }}
                  size="sm">
                  NO
                </Button>
              </Col>
            </Row>
            <br />


            {
              Q3_4 === true &&
              <div>
                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="12">
                    <label style={{ fontWeight: "bold" }}>
                      What is the total budget facilities/networks?
                    </label>
                    <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
                      <Row style={{ marginBottom: "-10px" }}>
                        <Col md="2" style={{ textAlign: "left" }}>
                          <a onClick={() => { this.setState({ Q3_4_A: 1 }) }}>0k - 10k</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "left" }}>
                          <a onClick={() => { this.setState({ Q3_4_A: 2 }) }}>10k - 100k</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "center" }}>
                          <a onClick={() => { this.setState({ Q3_4_A: 3 }) }}>100k - 1m</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "center" }}>
                          <a onClick={() => { this.setState({ Q3_4_A: 4 }) }}>1m - 10m</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "right" }}>
                          <a onClick={() => { this.setState({ Q3_4_A: 5 }) }}>10m - 100m</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "right" }}>
                          <a onClick={() => { this.setState({ Q3_4_A: 6 }) }}>> 100m</a>
                        </Col>
                      </Row>
                      <Slider
                        min={1}
                        max={6}
                        value={Q3_4_A}
                        style={{ marginLeft: "15px", marginRight: "15px" }}
                        onChange={(value) => { this.setState({ Q3_4_A: value }) }}
                      />
                    </div>
                  </Col>
                </Row>
                <br />

                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="5">
                    <label style={{ fontWeight: "bold" }}>
                      How long will the funding for the facilities/networks last?
                    </label>
                    <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
                      <Row style={{ marginBottom: "-10px" }}>
                        <Col md="4" style={{ textAlign: "left" }}>
                          <a onClick={() => { this.setState({ Q3_4_B: 1 }) }}>0 - 5</a>
                        </Col>
                        <Col md="4" style={{ textAlign: "center" }}>
                          <a onClick={() => { this.setState({ Q3_4_B: 2 }) }}>5 - 10</a>
                        </Col>
                        <Col md="4" style={{ textAlign: "right" }}>
                          <a onClick={() => { this.setState({ Q3_4_B: 3 }) }}>> 10</a>
                        </Col>
                      </Row>
                      <Slider
                        min={1}
                        max={3}
                        value={Q3_4_B}
                        style={{ marginLeft: "15px", marginRight: "15px" }}
                        onChange={(value) => { this.setState({ Q3_4_B: value }) }}
                      />
                    </div>
                  </Col>
                </Row>
                <br />

                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="8">
                    <label style={{ fontWeight: "bold" }}>
                      Who is the funding agency for the facilities/networks?
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
                            value={Q3_4_C}
                            callback={(value) => { this.setState({ Q3_4_C: value.id }) }}
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
                      Are there any partnering departments/organisations that share the cost for the facilities/networks?
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
                            value={Q3_4_D}
                            callback={(value) => { this.setState({ Q3_4_D: value.id }) }}
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
                  3.5 Select a Region for this plan:
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
                        value={Q3_5}
                        callback={(value) => { this.setState({ Q3_5: value.id }) }}
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
                  3.6 Specify non-government organisation name (if applicable).
                </label>
                <TextInput
                  width="95%"
                  value={Q3_6}
                  callback={(value) => {
                    value = _gf.fixEmptyValue(value, "")
                    this.setState({ Q3_6: value })
                  }}
                />
              </Col>
            </Row>

            <Row>
              <Col md="8">
                <label style={{ fontWeight: "bold" }}>
                  3.7 Select a sector for this plan:
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
                        value={Q3_7}
                        callback={(value) => { this.setState({ Q3_7: value.id }) }}
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
                  Based on your submission, your Goal 3 status is:
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

export default connect(mapStateToProps, mapDispatchToProps)(Goal3Contrib)

// 'use strict'

// import React from 'react'
// import { connect } from 'react-redux'
// import { Row, Col, Button, Input, Modal, ModalHeader, ModalBody, ModalFooter, Container } from 'mdbreact'
// import TextInput from '../../../input/TextInput.jsx'
// import { DEAGreen, DEAGreenDark, Red, Amber, Green } from '../../../../config/colours.js'
// import { apiBaseURL, ccrdBaseURL, vmsBaseURL, metadataServiceURL } from '../../../../../js/config/serviceURLs.js'
// import SelectInput from '../../../input/SelectInput.jsx'
// import TreeSelectInput from '../../../input/TreeSelectInput.jsx'
// import OData from 'react-odata'
// import buildQuery from 'odata-query'
// import FileUpload from '../../../input/FileUpload.jsx'
// import { metaDataCredentials } from '../../../../../js/secrets.js'

// //Ant.D
// import Slider from 'antd/lib/slider'
// import 'antd/lib/slider/style/css'

// import gear from '../../../../../images/Icons/gear.png'
// import checklist from '../../../../../images/Icons/checklist.png'
// import { CustomFetch } from '../../../../globalFunctions.js';
// import moment from 'moment'

// const _gf = require('../../../../globalFunctions')
// const _sf = require('./SharedFunctions.js')
// const basic = require('basic-authorization-header')

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
//   Q3_1: 1, //DisseminationUtilisation
//   Q3_2: 1, //MonitoringForcasting
//   Q3_3_1: "", //DocumentLink
//   Q3_3: false, //DedicatedFunding
//   Q3_3_A: 1, //TotalBudget
//   Q3_3_B: 1, //BudgetDuration
//   Q3_3_C: 0, //FundingAgency
//   Q3_3_D: 0, //PartneringDepartments
//   Q3_4: 0, //Region
//   Q3_5: "", //Institution
//   Q3_6: 0, //Sector
//   metaAddAuthorModal: false,
//   tmpMetaAuthorName: "",
//   tmpMetaAuthorEmail: "",
//   tmpMetaAuthorInstitution: "",
//   metaAuthors: [],
//   metaDocTitle: "",
//   metaKeywords: [],
//   metaDocDescr: "",
//   metaAgreement: false,
//   metaUID: "",
//   metaRegion: "",
//   attachmentDetails: { size: 0, name: "", format: "", version: 0 }, //JSON
//   isDraft: false
// }

// class Goal3Contrib extends React.Component {

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

//     let { goalStatus, Q3_1, Q3_2, Q3_3_1 } = this.state
//     let newGoalStatus = "R"
//     let redPoints = 0
//     let amberPoints = 0
//     let greenPoints = 0

//     //Check red conditions
//     if (Q3_1 === 1) {
//       redPoints += 1
//     }
//     if (Q3_2 === 1) {
//       redPoints += 1
//     }
//     if (Q3_3_1 === false) {
//       redPoints += 1
//     }
//     //Check amber conditions
//     if (Q3_1 === 2) {
//       amberPoints += 1
//     }
//     if (Q3_2 === 2) {
//       amberPoints += 1
//     }
//     if (Q3_3_1 === true) {
//       amberPoints += 1
//     }

//     //Check green conditions
//     if (Q3_1 === 3) {
//       greenPoints += 1
//     }
//     if (Q3_2 === 3) {
//       greenPoints += 1
//     }
//     if (Q3_3_1 === true) {
//       greenPoints += 1
//     }

//     //Parse result to status colour    
//     if (greenPoints === 2) {
//       newGoalStatus = "G"
//     }
//     else if (redPoints <= 1 || amberPoints > 0) {
//       newGoalStatus = "A"
//     }
//     else if (redPoints >= 2) {
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
//           Q3_1: parseInt(data.Questions.filter(x => x.Key === "DisseminationUtilisation")[0].Value),
//           Q3_2: parseInt(data.Questions.filter(x => x.Key === "MonitoringForcasting")[0].Value),
//           Q3_3_1: data.Questions.filter(x => x.Key === "DocumentLink")[0].Value,
//           Q3_3: data.Questions.filter(x => x.Key === "DedicatedFunding")[0].Value === 'true',
//           Q3_3_A: parseInt(data.Questions.filter(x => x.Key === "TotalBudget")[0].Value),
//           Q3_3_B: parseInt(data.Questions.filter(x => x.Key === "BudgetDuration")[0].Value),
//           Q3_3_C: parseInt(data.Questions.filter(x => x.Key === "FundingAgency")[0].Value),
//           Q3_3_D: parseInt(data.Questions.filter(x => x.Key === "PartneringDepartments")[0].Value),
//           Q3_4: parseInt(data.Questions.filter(x => x.Key === "Region")[0].Value),
//           Q3_5: data.Questions.filter(x => x.Key === "Institution")[0].Value,
//           Q3_6: parseInt(data.Questions.filter(x => x.Key === "Sector")[0].Value),
//           metaAuthors: data.Questions.filter(x => x.Key === "DocumentAuthors")[0].Value.split("||"),
//           metaDocTitle: data.Questions.filter(x => x.Key === "DocumentTitle")[0].Value,
//           metaKeywords: data.Questions.filter(x => x.Key === "DocumentKeywords")[0].Value.split("||"),
//           metaDocDescr: data.Questions.filter(x => x.Key === "DocumentDescription")[0].Value,
//           metaAgreement: data.Questions.filter(x => x.Key === "DocumentAgreement")[0].Value === 'true',
//           metaUID: data.Questions.filter(x => x.Key === "MetaDataUID")[0].Value,
//           metaRegion: data.Questions.filter(x => x.Key === "RegionName")[0].Value,
//           attachmentDetails: JSON.parse(data.Questions.filter(x => x.Key === "DocumentDetails")[0].Value),
//           isDraft: data.Questions.filter(x => x.Key === "IsDraft")[0].Value === 'true'
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

//     let { Q3_3_1 } = this.state
//     let { setLoading } = this.props
//     setLoading(true)

//     let validated = this.validate()

//     if (validated) {

//       let metaUID = ""

//       if (Q3_3_1 === true) {
//         metaUID = await this.generateMetaData()
//       }
//       if (metaUID !== null) {
//         await this.saveGoal(metaUID)
//       }
//     }

//     setLoading(false)
//   }

//   validate() {
//     let { Q3_3_1, metaDocTitle, metaKeywords, metaDocDescr, metaAgreement, metaAuthors } = this.state

//     if (Q3_3_1 === true) {

//       if (_gf.isEmptyValue(Q3_3_1)) {
//         this.showMessage("Required", "Document attachment required - please attach a document.")
//         return false
//       }

//       if (metaAuthors.length === 0) {
//         this.showMessage("Required", "Document author(s) required - please add at least one author.")
//       }
//       if (_gf.isEmptyValue(metaDocTitle)) {
//         this.showMessage("Required", "Document title required - please provide a title for your document.")
//         return false
//       }

//       if (metaKeywords.length === 0) {
//         this.showMessage("Required", "Document keywords required - please add at least one keyword.")
//         return false
//       }

//       if (_gf.isEmptyValue(metaDocDescr)) {
//         this.showMessage("Required", "Document description required - please provide a short abstract description of your document.")
//         return false
//       }

//       if (metaAgreement === false) {
//         this.showMessage("Required", "Licence agreement required - please accept the licence agreement.")
//         return false
//       }
//     }

//     return true
//   }

//   async saveGoal(metaUID) {

//     let {
//       goalId, goalStatus, Q3_1, Q3_2, Q3_3, Q3_3_A, Q3_3_B, Q3_3_C,
//       Q3_3_D, Q3_4, Q3_5, Q3_6, Q3_3_1, attachmentDetails,
//       metaKeywords, isDraft, metaDocDescr, metaDocTitle, metaAuthors, metaAgreement, metaRegion
//     } = this.state

//     let { user } = this.props

//     //Construct post body
//     let goal = {
//       Id: goalId,
//       CreateUser: user.profile.UserId,
//       Status: goalStatus,
//       Type: 3,
//       Questions: [
//         { Key: "DisseminationUtilisation", Value: Q3_1.toString() },
//         { Key: "MonitoringForcasting", Value: Q3_2.toString() },
//         { Key: "DedicatedFunding", Value: Q3_3.toString() },
//         { Key: "TotalBudget", Value: Q3_3_A.toString() },
//         { Key: "BudgetDuration", Value: Q3_3_B.toString() },
//         { Key: "FundingAgency", Value: Q3_3_C.toString() },
//         { Key: "PartneringDepartments", Value: Q3_3_D.toString() },
//         { Key: "Region", Value: Q3_4.toString() },
//         { Key: "Institution", Value: Q3_5 },
//         { Key: "Sector", Value: Q3_6.toString() },
//         { Key: "DocumentLink", Value: Q3_3_1 },
//         { Key: "DocumentDetails", Value: JSON.stringify(attachmentDetails) },
//         { Key: "DocumentAuthors", Value: metaAuthors.join("||") },
//         { Key: "DocumentTitle", Value: metaDocTitle },
//         { Key: "DocumentKeywords", Value: metaKeywords.join("||") },
//         { Key: "DocumentDescription", Value: metaDocDescr },
//         { Key: "DocumentAgreement", Value: metaAgreement.toString() },
//         { Key: "RegionName", Value: metaRegion.toString() },
//         { Key: "MetaDataUID", Value: metaUID },
//         { Key: "IsDraft", Value: isDraft }

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

//   async generateMetaData() {

//     let {
//       goalId, Q3_3_1, metaAuthors, metaDocTitle, metaKeywords,
//       metaDocDescr, attachmentDetails, metaUID, metaRegion
//     } = this.state

//     //Get creators
//     let creators = []
//     metaAuthors.map(auth => {
//       let authSplit = auth.split(", ")
//       if (authSplit.length === 3) {
//         creators.push({
//           creatorName: authSplit[0].trim(),
//           affiliation: `Organisation: ${authSplit[2].trim()}; e-Mail Address: ${authSplit[1].trim()}`
//         })
//       }
//     })

//     //Get subjects
//     let subjects = []
//     metaKeywords.map(keywrd => {
//       subjects.push({
//         subject: keywrd,
//         subjectScheme: "",
//         schemeURI: ""
//       })
//     })

//     // get resourcetype
//     let resourceType = ""
//     let resTypeIndex = attachmentDetails.name.lastIndexOf(".")
//     if (resTypeIndex > -1) {
//       resourceType = attachmentDetails.name.substring(resTypeIndex + 1, attachmentDetails.name.length)
//     }

//     // get related identifiers
//     let relatedIdentifiers = []
//     if (!_gf.isEmptyValue(metaUID)) {
//       relatedIdentifiers = [
//         {
//           relatedIdentifier: metaUID, //UID of previous metadata record
//           relatedIdentifierType: "URL",
//           relationType: "isPreviousVersionOf"
//         }
//       ]
//     }

//     // construct post body
//     let jsonData = {
//       xsiSchema: "http://datacite.org/schema/kernel-3",
//       publisher: 'Department of Environmental Affairs',
//       publicationYear: new Date().getFullYear().toString(),
//       language: 'eng',
//       titles: [
//         {
//           titleType: "",
//           title: metaDocTitle
//         }
//       ],
//       // doc abstract
//       description: [
//         {
//           descriptionType: 'Abstract',
//           description: metaDocDescr
//         }
//       ],
//       // doc type
//       resourceType: {
//         resourceTypeGeneral: 'Dataset', // selected doc format (eg text)
//         resourceType: resourceType.toUpperCase() // file extention (eg pdf)
//       },
//       // format of extracted media (eg pdf)
//       formats: [
//         {
//           format: attachmentDetails.format
//         }
//       ],
//       // keywords
//       subjects: subjects,
//       // region
//       geoLocations: [
//         { geoLocationPlace: metaRegion }
//       ],
//       relatedIdentifiers: relatedIdentifiers,
//       alternateIdentifiers: [
//         {
//           alternateIdentifier: goalId,
//           alternateIdentifierType: "UID"
//         }
//       ],
//       //authors
//       creators: creators,
//       dates: [
//         {
//           date: moment().format("YYYY-MM-DD"), // date of doc upload
//           dateType: "Submitted",
//           dateInformation: "Document last update date"
//         }
//       ],
//       rights: [
//         {
//           rights: "Attributio 4.0 International (CC BY 4.0)",
//           rightsURI: "https://creativecommons.org/licenses/by/4.0/"
//         }
//       ],
//       // file size in bytes
//       sizes: [
//         {
//           size: `${attachmentDetails.size} B`
//         }
//       ],
//       // file version number
//       version: attachmentDetails.version.toString(),
//       additionalFileds: {
//         onlineResources: [
//           {
//             func: "download",
//             desc: attachmentDetails.name,
//             href: Q3_3_1,
//             format: resourceType.toUpperCase()
//           }
//         ]
//       },
//       // required
//       bounds: []
//     }

//     try {
//       let res = await CustomFetch(metadataServiceURL, {
//         method: "POST",
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//           'Authorization': basic(metaDataCredentials.username, metaDataCredentials.password)
//         },
//         body: new URLSearchParams({
//           metadataType: 'DataCite',
//           jsonData: JSON.stringify(jsonData)
//         }).toString()
//       })

//       // get status
//       let status = res.ok

//       // get response body
//       res = await res.json()

//       if (!status) {
//         throw new Error(res.error.message)
//       }
//       else if (res.status !== "success") {
//         throw new Error(`\nLog:\n${res.log.join("\n")}`)
//       }

//       //Process result
//       return res.url
//     }
//     catch (ex) {
//       console.error("Unable to create meta-data record.\n", ex)
//       this.showMessage("Meta-data creation failed", "Unable to create meta-data record. (See log for details)")

//       return null
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

//     let { editing, goalStatus, goalId, metaAuthors, metaAddAuthorModal, metaAgreement, isDraft, metaKeywords, metaKeywordsList,
//       metaDocDescr, metaDocTitle, tmpMetaAuthorEmail, tmpMetaAuthorInstitution, tmpMetaAuthorName, TextAreaInput, attachmentDetails,
//       Q3_1, Q3_2, Q3_3_1, Q3_3, Q3_3_A, Q3_3_B, Q3_3_C, Q3_3_D, Q3_4, Q3_5, Q3_6
//     } = this.state


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
//               Goal 3. Accurate climate information (e.g. historical trend data, seasonal predictions,
//               future projections, and early warning of extreme weather and other climate-related events)
//               provided by existing and new monitoring and forecasting facilities/networks (including their
//               maintenance and enhancement) to inform adaptation planning and disaster risk reduction.
//             </h5>
//             <p style={{ marginTop: "20px", marginBottom: "2px" }}>
//               <b>What is being monitored and evaluated:</b>
//             </p>
//             <ol style={{ marginLeft: "-15px" }}>
//               <li>
//                 Historical climate trends;
//               </li>
//               <li>
//                 Fine-scale projections, forecasts (seasonal to inter-annual and intra-seasonal variability)
//                 and early warning systems for provincial and municipal use;
//               </li>
//               <li>
//                 Dissemination and communication platforms for weather and climate-related events
//                 (e.g. SMS and media);
//               </li>
//               <li>
//                 Utilisation of data/information products by end-users; and
//               </li>
//               <li>
//                 Maintenance and enhancements of monitoring and forecasting facilities/networks.
//               </li>
//             </ol>
//             <p style={{ marginBottom: "5px" }}>
//               <b>How it is being evaluated:</b>
//             </p>
//             <table style={{ width: "95%", marginLeft: "-30px", marginBottom: "-15px" }}>
//               <tbody>
//                 <tr>
//                   <td width="30px">
//                     <b>3.1</b>
//                   </td>
//                   <td style={{ color: "white", padding: "10px", backgroundColor: Red }}>
//                     <p style={{ marginBottom: "0px" }}>
//                       <b>RED </b>
//                       No dissemination and utilisation of weather and climate-related information.
//                     </p>
//                   </td>
//                 </tr>
//                 <tr>
//                   <td width="30px"></td>
//                   <td style={{ color: "white", padding: "10px", backgroundColor: Amber }}>
//                     <p style={{ marginBottom: "0px" }}>
//                       <b>AMBER </b>
//                       Dissemination but no utilisation of weather and climate-related information.
//                     </p>
//                   </td>
//                 </tr>
//                 <tr>
//                   <td width="30px"></td>
//                   <td style={{ color: "white", padding: "10px", backgroundColor: Green }}>
//                     <p style={{ marginBottom: "0px" }}>
//                       <b>GREEN </b>
//                       Dissemination and utilisation of weather and climate-related information at
//                       provincial, municipal and community levels.
//                     </p>
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//             <br />
//             <table style={{ width: "95%", marginLeft: "-30px" }}>
//               <tbody>
//                 <tr>
//                   <td width="30px">
//                     <b>3.2</b>
//                   </td>
//                   <td style={{ color: "white", padding: "10px", backgroundColor: Red }}>
//                     <p style={{ marginBottom: "0px" }}>
//                       <b>RED </b>
//                       Lack of monitoring and forecasting facilities/networks.
//                     </p>
//                   </td>
//                 </tr>
//                 <tr>
//                   <td width="30px"></td>
//                   <td style={{ color: "white", padding: "10px", backgroundColor: Amber }}>
//                     <p style={{ marginBottom: "0px" }}>
//                       <b>AMBER </b>
//                       Monitoring facilities/networks exist but are not well-maintained or enhanced.
//                     </p>
//                   </td>
//                 </tr>
//                 <tr>
//                   <td width="30px"></td>
//                   <td style={{ color: "white", padding: "10px", backgroundColor: Green }}>
//                     <p style={{ marginBottom: "0px" }}>
//                       <b>GREEN </b>
//                       Monitoring facilities/networks exist and are maintained and enhanced.
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
//               Goal 3 Assessment
//             </h5>
//             <br />

//             <Row>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   3.1 Does your organisation participate in dissemination and/or utilisation of climate change information?
//                 </label>
//                 <div style={{ marginLeft: "-22px", marginTop: "-10px" }}>
//                   <Input
//                     onClick={() => { this.setState({ Q3_1: 1 }) }}
//                     checked={Q3_1 === 1 ? true : false}
//                     label="No dissemination and utilisation of weather and climate-related information."
//                     type="radio"
//                     id="radDiss1"
//                   />
//                   <Input
//                     onClick={() => { this.setState({ Q3_1: 2 }) }}
//                     checked={Q3_1 === 2 ? true : false}
//                     label="Dissemination but no utilisation of weather and climate-related information."
//                     type="radio"
//                     id="radDiss2"
//                   />
//                   <Input
//                     onClick={() => { this.setState({ Q3_1: 3 }) }}
//                     checked={Q3_1 === 3 ? true : false}
//                     label="Utilisation of weather and climate-related information at provincial, municipal and community levels."
//                     type="radio"
//                     id="radDiss3"
//                   />
//                 </div>
//               </Col>
//             </Row>
//             <br />

//             <Row>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   3.2 Does your organisation have access to data from or maintain monitoring and forecasting facilities/networks?
//                 </label>
//                 <div style={{ marginLeft: "-22px", marginTop: "-10px" }}>
//                   <Input
//                     onClick={() => { this.setState({ Q3_2: 1 }) }}
//                     checked={Q3_2 === 1 ? true : false}
//                     label="No monitoring and forecasting facilities/networks."
//                     type="radio"
//                     id="radMon1"
//                   />
//                   <Input
//                     onClick={() => { this.setState({ Q3_2: 2 }) }}
//                     checked={Q3_2 === 2 ? true : false}
//                     label="Monitoring facilities/networks exist but are not well-maintained or enhanced."
//                     type="radio"
//                     id="radMon2"
//                   />
//                   <Input
//                     onClick={() => { this.setState({ Q3_2: 3 }) }}
//                     checked={Q3_2 === 3 ? true : false}
//                     label="Monitoring facilities/networks exist and are maintained and enhanced."
//                     type="radio"
//                     id="radMon3"
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
//                       Q3_3_1: fileInfo.Link,
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
//              !_gf.isEmptyValue(Q3_3_1) &&
              
//               <div>
//                 <Row style={{ marginLeft: "0px" }}>
//                   <Col md="12">
//                     <label style={{ fontWeight: "bold" }}>
//                       Who wrote the document?
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
//                       What is the title of the document?
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
//                       Please select all keywords that apply to the document:
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
//                       Please include an abstract or description for the document:
//                     <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
//                     </label>
//                     <TextAreaInput
//                       width="95%"
//                       value={metaDocDescr}
//                       callback={(value) => {
//                         this.setState({ metaDocDescr: value })
//                       }}
//                       readOnly={true}
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

//             <Row style={{ marginBottom: "2px" }}>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   3.3 Does your climate change unit have dedicated funding (y/n)?
//                 </label>
//                 <br />
//                 <Button
//                   onClick={() => { this.setState({ Q3_3: true }) }}
//                   color=""
//                   style={{ fontSize: Q3_3 ? "13px" : "10px", marginLeft: "0px", backgroundColor: Q3_3 ? DEAGreen : "grey" }}
//                   size="sm">
//                   YES
//                 </Button>
//                 <Button
//                   onClick={() => { this.setState({ Q3_3: false }) }}
//                   color=""
//                   style={{ fontSize: !Q3_3 ? "13px" : "10px", backgroundColor: !Q3_3 ? DEAGreen : "grey" }}
//                   size="sm">
//                   NO
//                 </Button>
//               </Col>
//             </Row>
//             <br />


//             {
//               Q3_3 === true &&
//               <div>
//                 <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
//                   <Col md="12">
//                     <label style={{ fontWeight: "bold" }}>
//                       What is the total budget facilities/networks?
//                     </label>
//                     <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
//                       <Row style={{ marginBottom: "-10px" }}>
//                         <Col md="2" style={{ textAlign: "left" }}>
//                           <a onClick={() => { this.setState({ Q3_3_A: 1 }) }}>0k - 10k</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "left" }}>
//                           <a onClick={() => { this.setState({ Q3_3_A: 2 }) }}>10k - 100k</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "center" }}>
//                           <a onClick={() => { this.setState({ Q3_3_A: 3 }) }}>100k - 1m</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "center" }}>
//                           <a onClick={() => { this.setState({ Q3_3_A: 4 }) }}>1m - 10m</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "right" }}>
//                           <a onClick={() => { this.setState({ Q3_3_A: 5 }) }}>10m - 100m</a>
//                         </Col>
//                         <Col md="2" style={{ textAlign: "right" }}>
//                           <a onClick={() => { this.setState({ Q3_3_A: 6 }) }}>> 100m</a>
//                         </Col>
//                       </Row>
//                       <Slider
//                         min={1}
//                         max={6}
//                         value={Q3_3_A}
//                         style={{ marginLeft: "15px", marginRight: "15px" }}
//                         onChange={(value) => { this.setState({ Q3_3_A: value }) }}
//                       />
//                     </div>
//                   </Col>
//                 </Row>
//                 <br />

//                 <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
//                   <Col md="5">
//                     <label style={{ fontWeight: "bold" }}>
//                       How long will the funding for the facilities/networks last?
//                     </label>
//                     <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
//                       <Row style={{ marginBottom: "-10px" }}>
//                         <Col md="4" style={{ textAlign: "left" }}>
//                           <a onClick={() => { this.setState({ Q3_3_B: 1 }) }}>0 - 5</a>
//                         </Col>
//                         <Col md="4" style={{ textAlign: "center" }}>
//                           <a onClick={() => { this.setState({ Q3_3_B: 2 }) }}>5 - 10</a>
//                         </Col>
//                         <Col md="4" style={{ textAlign: "right" }}>
//                           <a onClick={() => { this.setState({ Q3_3_B: 3 }) }}>> 10</a>
//                         </Col>
//                       </Row>
//                       <Slider
//                         min={1}
//                         max={3}
//                         value={Q3_3_B}
//                         style={{ marginLeft: "15px", marginRight: "15px" }}
//                         onChange={(value) => { this.setState({ Q3_3_B: value }) }}
//                       />
//                     </div>
//                   </Col>
//                 </Row>
//                 <br />

//                 <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
//                   <Col md="8">
//                     <label style={{ fontWeight: "bold" }}>
//                       Who is the funding agency for the facilities/networks?
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
//                             value={Q3_3_C}
//                             callback={(value) => { this.setState({ Q3_3_C: value.id }) }}
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
//                       Are there any partnering departments/organisations that share the cost for the facilities/networks?
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
//                             value={Q3_3_D}
//                             callback={(value) => { this.setState({ Q3_3_D: value.id }) }}
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
//                   3.4 Select a Region for this plan:
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
//                         value={Q3_4}
//                         callback={(value) => { this.setState({ Q3_4: value.id }) }}
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
//                   3.5 Specify non-government organisation name (if applicable).
//                 </label>
//                 <TextInput
//                   width="95%"
//                   value={Q3_5}
//                   callback={(value) => {
//                     value = _gf.fixEmptyValue(value, "")
//                     this.setState({ Q3_5: value })
//                   }}
//                 />
//               </Col>
//             </Row>

//             <Row>
//               <Col md="8">
//                 <label style={{ fontWeight: "bold" }}>
//                   3.6 Select a sector for this plan:
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
//                         value={Q3_6}
//                         callback={(value) => { this.setState({ Q3_6: value.id }) }}
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
//                   Based on your submission, your Goal 3 status is:
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

//         {/* Add author modal */}
//         <Modal isOpen={this.state.metaAddAuthorModal} toggle={() => { this.setState({ metaAddAuthorModal: false }) }} centered>
//           <ModalHeader toggle={() => { this.setState({ metaAddAuthorModal: false }) }}>
//             Add author details:
//                 </ModalHeader>
//           <ModalBody>
//             <Row>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   Name:
//                         <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
//                 </label>
//                 <TextInput
//                   width="95%"
//                   value={tmpMetaAuthorName}
//                   callback={(value) => {
//                     this.setState({ tmpMetaAuthorName: value }) // console.log(value)
//                   }}
//                 />
//               </Col>
//             </Row>
//             <Row>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   Email:
//                         <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
//                 </label>
//                 <TextInput
//                   width="95%"
//                   value={tmpMetaAuthorEmail}
//                   callback={(value) => {
//                     this.setState({ tmpMetaAuthorEmail: value })
//                   }}
//                 />
//               </Col>
//             </Row>
//             <Row>
//               <Col md="12">
//                 <label style={{ fontWeight: "bold" }}>
//                   Institution:
//                         <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
//                 </label>
//                 <TextInput
//                   width="95%"
//                   value={tmpMetaAuthorInstitution}
//                   callback={(value) => {
//                     this.setState({ tmpMetaAuthorInstitution: value })
//                   }}
//                 />
//               </Col>
//             </Row>
//           </ModalBody>
//           <ModalFooter>
//             <Button
//               disabled={_gf.isEmptyValue(tmpMetaAuthorName) || _gf.isEmptyValue(tmpMetaAuthorEmail) || _gf.isEmptyValue(tmpMetaAuthorInstitution)}
//               size="sm"
//               style={{ width: "100px", backgroundColor: DEAGreen }}
//               color="" onClick={() => this.setState({
//                 metaAddAuthorModal: false,
//                 metaAuthors: [...metaAuthors, `${tmpMetaAuthorName}, ${tmpMetaAuthorEmail}, ${tmpMetaAuthorInstitution}`],
//                 tmpMetaAuthorName: "",
//                 tmpMetaAuthorEmail: "",
//                 tmpMetaAuthorInstitution: ""
//               })}
//             >
//               Add
//                   </Button>
//             <Button
//               size="sm"
//               style={{ width: "100px", backgroundColor: DEAGreen }}
//               color="" onClick={() => this.setState({
//                 metaAddAuthorModal: false,
//                 tmpMetaAuthorName: "",
//                 tmpMetaAuthorEmail: "",
//                 tmpMetaAuthorInstitution: ""
//               })} >
//               Cancel
//                   </Button>
//           </ModalFooter>
//         </Modal>

//       </>
//     )
//   }
// }

// export default connect(mapStateToProps, mapDispatchToProps)(Goal3Contrib)