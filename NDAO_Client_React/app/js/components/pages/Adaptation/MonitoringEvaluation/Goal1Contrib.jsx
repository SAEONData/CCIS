'use strict'

import React from 'react'
import { connect } from 'react-redux'
import { Row, Col, Button, Input, Modal, ModalHeader, ModalBody, ModalFooter, } from 'mdbreact'
import TextInput from '../../../input/TextInput.jsx'
import TextAreaInput from '../../../input/TextAreaInput.jsx'
import TreeSelectInput from '../../../input/TreeSelectInput.jsx'
import { DEAGreen, Red, Amber, Green } from '../../../../config/colours.js'
import DateInput from '../../../input/DateInput.jsx'
import NCCRD from '../../../pages/Tools/NCCRD.jsx'
import FileUpload from '../../../input/FileUpload.jsx'
import { apiBaseURL, ccrdBaseURL, vmsBaseURL, metadataServiceURL } from '../../../../../js/config/serviceURLs.js'
import moment from 'moment'
import OData from 'react-odata'
import buildQuery from 'odata-query'
import { metaDocFormatsList } from '../../../../../data/metaDocFormatsList.js'
import { metaKeywordsList } from '../../../../../data/metaKeywordsList.js'
import { metaDataCredentials } from '../../../../../js/secrets.js'

//Images
import gear from '../../../../../images/Icons/gear.png'
import checklist from '../../../../../images/Icons/checklist.png'
import { CustomFetch } from '../../../../globalFunctions.js';
import { Card } from 'antd';

const _gf = require('../../../../globalFunctions')
const _sf = require('./SharedFunctions.js')
const basic = require('basic-authorization-header');

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
  showNCCRD: false,
  goalId: _gf.GetUID(),
  attachmentDetails: { size: 0, name: "", format: "", version: 0 }, //JSON
  Q1_1: "", //DocumentLink
  Q1_3: false, //HasAssessment
  Q1_4: moment().format("YYYY-MM-DD"), //DocLastUpdated
  Q1_5: 0, //Region
  Q1_6: "", //Institution
  Q1_7: 0, //Sector
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
  metaRegion: ""
  // isDraft: false
}

class Goal1Contrib extends React.Component {

  constructor(props) {
    super(props);

    this.NCCRD_CloseCallback = this.NCCRD_CloseCallback.bind(this)
    this.reset = this.reset.bind(this)
    this.submit = this.submit.bind(this)
    this.showMessage = this.showMessage.bind(this)
    this.assessGoalStatus = this.assessGoalStatus.bind(this)

    this.state = defaultState
  }

  showMessage(title, message) {

    let { setLoading } = this.props
    setLoading(true)

    this.setState({
      title,
      message,
      messageModal: true
    })
  }

  componentDidMount() {
    let { updateNav } = this.props
    updateNav(location.hash)
  }

  componentDidUpdate() {
    let { editGoalId } = this.props
    if (editGoalId) {
      this.getEditGoalData(editGoalId)
    }

    this.assessGoalStatus()
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
          Q1_1: data.Questions.filter(x => x.Key === "DocumentLink")[0].Value,
          Q1_3: data.Questions.filter(x => x.Key === "HasAssessment")[0].Value === 'true',
          Q1_4: data.Questions.filter(x => x.Key === "DocLastUpdated")[0].Value,
          Q1_5: parseInt(data.Questions.filter(x => x.Key === "Region")[0].Value),
          Q1_6: data.Questions.filter(x => x.Key === "Institution")[0].Value,
          Q1_7: parseInt(data.Questions.filter(x => x.Key === "Sector")[0].Value),
          metaAuthors: data.Questions.filter(x => x.Key === "DocumentAuthors")[0].Value.split("||"),
          metaDocTitle: data.Questions.filter(x => x.Key === "DocumentTitle")[0].Value,
          metaKeywords: data.Questions.filter(x => x.Key === "DocumentKeywords")[0].Value.split("||"),
          metaDocDescr: data.Questions.filter(x => x.Key === "DocumentDescription")[0].Value,
          metaAgreement: data.Questions.filter(x => x.Key === "DocumentAgreement")[0].Value === 'true',
          metaUID: data.Questions.filter(x => x.Key === "MetaDataUID")[0].Value,
          metaRegion: data.Questions.filter(x => x.Key === "RegionName")[0].Value,
          attachmentDetails: JSON.parse(data.Questions.filter(x => x.Key === "DocumentDetails")[0].Value)
          // isDraft: data.Questions.filter(x => x.Key === "IsDraft")[0].Value === 'true'
        })
      }

      this.props.setLoading(false)
    }
    catch (ex) {
      this.props.setLoading(false)
      console.error(ex)
    }
  }

  NCCRD_CloseCallback() {
    this.setState({ showNCCRD: false })
  }

  async submit() {

    let { setLoading } = this.props
    setLoading(true)

    let validated = this.validate()
    if (validated) {
      let metaUID = await this.generateMetaData()
      if (metaUID !== null) {
        await this.saveGoal(metaUID)
      }
    }

    setLoading(false)
  }

  validate() {

    let { 
      Q1_1, metaAuthors, metaDocTitle, metaKeywords, metaDocDescr, metaAgreement 
    } = this.state

    if(_gf.isEmptyValue(Q1_1)){
      this.showMessage("Required", "Document attachment required - please attach a document")
      return false
    }

    if(metaAuthors.length === 0){
      this.showMessage("Required", "Document author(s) required - please add at least one author")
      return false
    }

    if(_gf.isEmptyValue(metaDocTitle)){
      this.showMessage("Required", "Document title required - please provide a title for your document")
      return false
    }

    if(metaKeywords.length === 0){
      this.showMessage("Required", "Document keywords required - please add at least one keyword")
      return false
    }

    if(_gf.isEmptyValue(metaDocDescr)){
      this.showMessage("Required", "Document description required - please provide a short abstract description of your document")
      return false
    }

    if(metaAgreement === false){
      this.showMessage("Required", "License agreement required - please accept the licence agreement")
      return false
    }

    return true
  }

  async saveGoal(metaUID) {

    let {
      goalId, goalStatus, Q1_1, Q1_3, Q1_4, Q1_5, Q1_6, Q1_7, metaAuthors, metaDocTitle, metaKeywords,
      metaDocDescr, metaAgreement, attachmentDetails, metaRegion
    } = this.state
    let { user } = this.props

    //Construct post body
    let goal = {
      Id: goalId,
      CreateUser: user.profile.UserId,
      Status: goalStatus,
      Type: 1,
      Questions: [
        { Key: "DocumentLink", Value: Q1_1 },
        { Key: "DocumentDetails", Value: JSON.stringify(attachmentDetails) }, //file details as JSON string
        { Key: "HasAssessment", Value: Q1_3.toString() },
        { Key: "DocLastUpdated", Value: Q1_4 },
        { Key: "Region", Value: Q1_5.toString() },
        { Key: "RegionName", Value: metaRegion.toString() },
        { Key: "Institution", Value: Q1_6 },
        { Key: "Sector", Value: Q1_7.toString() },
        { Key: "DocumentAuthors", Value: metaAuthors.join("||") },
        { Key: "DocumentTitle", Value: metaDocTitle },
        { Key: "DocumentKeywords", Value: metaKeywords.join("||") },
        { Key: "DocumentDescription", Value: metaDocDescr },
        { Key: "DocumentAgreement", Value: metaAgreement.toString() },
        { Key: "MetaDataUID", Value: metaUID }
        // { Key: "IsDraft", Value: isDraft }
      ]
    }

    //Submit
    try {
      let res = await CustomFetch(apiBaseURL + 'Goals', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + (user === null )
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

  async generateMetaData() {

    let {
      goalId, Q1_1, Q1_4, metaAuthors, metaDocTitle, metaKeywords,
      metaDocDescr, attachmentDetails, metaUID, metaRegion
    } = this.state

    //Get Creators
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

    //Get Subjects
    let subjects = []
    metaKeywords.map(keywrd => {
      subjects.push({
        subject: keywrd,
        subjectScheme: "",
        schemeURI: ""
      })
    })

    //Get ResourceType>>resourceType
    let resourceType = ""
    let resTypeIndex = attachmentDetails.name.lastIndexOf(".")
    if (resTypeIndex > -1) {
      resourceType = attachmentDetails.name.substring(resTypeIndex + 1, attachmentDetails.name.length)
    }

    //Get related identifiers
    let relatedIdentifiers = []
    if (!_gf.isEmptyValue(metaUID)) {
      relatedIdentifiers = [
        {
          relatedIdentifier: metaUID, //UID of previous meta-data record
          relatedIdentifierType: "URL", //UID is in URL form
          relationType: "IsPreviousVersionOf"
        }
      ]
    }

    //contruct post body
    let jsonData = {
      xsiSchema: "http://datacite.org/schema/kernel-3",
      publisher: 'Department of Environmental Affairs',
      publicationYear: new Date().getFullYear().toString(),
      language: 'eng',
      titles: [
        {
          titleType: "",
          title: metaDocTitle //Document Title
        }
      ],
      description: [
        {
          //Document abstract
          descriptionType: 'Abstract',
          description: metaDocDescr
        }
      ],
      resourceType: {
        resourceTypeGeneral: 'Dataset', //Selected ducument format, eg. Text
        resourceType: resourceType.toUpperCase() //file extension, eg. PDF
      },
      formats: [
        {
          format: attachmentDetails.format //extracted file/media format, eg. application/pdf
        }
      ],
      subjects: subjects, //Keywords
      geoLocations: [
        { geoLocationPlace: metaRegion } //Region
      ],
      relatedIdentifiers: relatedIdentifiers,
      alternateIdentifiers: [
        {
          alternateIdentifier: goalId,
          alternateIdentifierType: "UID"
        }
      ],
      creators: creators, //Authors
      dates: [
        {
          date: moment().format("YYYY-MM-DD"), //Document submit/upload date
          dateType: "Submitted",
          dateInformation: "Document submit/upload date"
        },
        {
          date: Q1_4, //Document last update date
          dateType: "Updated",
          dateInformation: "Document last update date"
        }
      ],
      rights: [ //Acknowledged licence
        {
          rights: "Attribution 4.0 International (CC BY 4.0)",
          rightsURI: "https://creativecommons.org/licenses/by/4.0/"
        }
      ],
      sizes: [{ size: `${attachmentDetails.size} B` }], //File size in bytes 
      version: attachmentDetails.version.toString(), //File verion number
      additionalFields: {
        onlineResources: [
          {
            func: "download",
            desc: attachmentDetails.name,
            href: Q1_1,
            format: resourceType.toUpperCase()
          }
        ]
      },
      bounds: [] //required
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

      //Get status
      let status = res.ok

      //Get response body
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

  async waitForMessageClosed() {

    while (this.state.messageModal === true) {
      await _gf.wait(250)
    }

    return true
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

  async assessGoalStatus() {

    let { goalStatus, goalId, Q1_1 } = this.state
    let statusValues = ["R", "A", "G"]
    let goalStatusNew = 0

    //Checkpoint 1 - Document Link
    if (!_gf.isEmptyValue(Q1_1)) {
      goalStatusNew += 1
    }

    //Checkpoint 2 - Ataptation/Mitigation >> Operational/Complete
    let query = buildQuery({
      filter: {
        AdaptationDetails: {
          any: {
            ProjectStatusId: {
              gt: 1
            }
          }
        }
      },
      filter: {
        MitigationDetails: {
          any: {
            ProjectStatusId: {
              gt: 1
            }
          }
        }
      },
      filter: {
        ProjectDAOs: {
          any: {
            daoid: {
              eq: {
                type: 'guid',
                value: goalId
              }
            },
          }
        }
      }
    })

    try {

      let res = await CustomFetch(`${ccrdBaseURL}Projects${query}`)

      if (!res.ok) {
        //Get response body
        res = await res.json()
        throw new Error(res.error.message)
      }
      else {
        res = await res.json()

        if (res.value && res.value.length > 0) {
          goalStatusNew += 1
        }
      }
    }
    catch (ex) {
      console.error(ex)
    }

    //Conclusion
    if (statusValues[goalStatusNew] !== goalStatus) {
      this.setState({ goalStatus: statusValues[goalStatusNew] })
    }
  }

  render() {

    let {
      editing, goalId, goalStatus, showNCCRD, Q1_1, Q1_3, Q1_4, Q1_5, Q1_6, Q1_7,
      metaAddAuthorModal, metaAuthors, tmpMetaAuthorName, tmpMetaAuthorEmail, attachmentDetails, 
      tmpMetaAuthorInstitution, metaDocTitle, metaKeywords, metaDocDescr, metaAgreement
    } = this.state

    let { user } = this.props

    let NCCRD_Config = {
      header: true,
      navbar: true,
      sidenav: false,
      footer: false,
      DAOId: goalId,
      readOnly: false,
      backToList: true,
      user: "",
      listOptions: {
        expandCollapse: false,
        view: true,
        favorites: false,
        filters: false,
        detailsInParent: false
      }
    }
    // console.log("jsonData", attachmentDetails, user)
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
              Goal 1. Robust/integrated plans, policies and actions for effective delivery of climate change
              adaptation, together with monitoring, evaluation and review over the short, medium and longer-term.
            </h5>
            <p style={{ marginTop: "20px" }}>
              <b>What is being monitored and evaluated:</b>
              <br />
              Number of business, sectoral, provincial and municipal legal frameworks, plans/strategies,
              policies, programmes and projects that incorporate climate change adaptation (e.g. Spatial
              Development Frameworks/Environmental Management Frameworks, Growth and Development Strategies,
              Disaster Management Plans, Conservation Plans, Food Security Strategies, Energy Security
              Strategies, Coastal Management Programmes, Agricultural Plans and Strategies, Integrated
              Development Plans and associated Sector Plans as prescribed in Municipal Systems and
              Structures Act, Water Catchment Strategies, Integrated Waste Management Plans, Alien
              Invasive Strategies, Environmental Impact Assessments, International Agreements on Water
              Allocation, Business Plans, Land Capability Plans, Air Quality Plans, Greening Strategies/Green
              Economy Strategies, Transport Strategies, Water Management Strategies, Forest Protection
              Strategies, Education Plans, Economic Plans, Tourism Plans, Human Settlements/Rural Development
              Plans, licensing/permitting/authorisation procedures and by-laws, and broader risk
              management procedures).*
            </p>
            <p style={{ marginBottom: "3px" }}>
              <b>How it is being evaluated:</b>
            </p>
            <table style={{ width: "95%" }}>
              <tbody>
                <tr style={{ backgroundColor: Red }}>
                  <td style={{ color: "white", padding: "10px" }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>RED </b>
                      Legal frameworks, plans/strategies, policies, programmes and projects not informed by
                      existing risk and vulnerability profiles that include climate risks and impacts.
                    </p>
                  </td>
                </tr>
                <tr style={{ backgroundColor: Amber }}>
                  <td style={{ color: "white", padding: "10px" }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>AMBER </b>
                      Legal frameworks, plans/strategies, policies, programmes and projects informed by risk
                      and vulnerability profiles that include climate risks and impacts.
                    </p>
                  </td>
                </tr>
                <tr style={{ backgroundColor: Green }}>
                  <td style={{ color: "white", padding: "10px" }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>GREEN </b>
                      Implementation of legal frameworks, plans/strategies, policies, programmes and
                      projects - informed by risk and vulnerability profiles that include climate
                      risks and impacts - to reduce vulnerability in risk and vulnerability profiles and enhance capacity to respond to climate change impacts.
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
        <br />
        <Row style={{ marginLeft: "0px" }}>
          <Col md="1">
            <img src={checklist} style={{ height: "40px", marginBottom: "10px", marginLeft: "0px", marginRight: "5px" }} />
          </Col>
          <Col md="11">
            <h5 style={{ fontWeight: "bold", marginTop: "8px" }}>
              Goal 1 Assessment
            </h5>
            </Col>
            </Row>
            <br />
            <Card>
            <h6>Part A</h6>
            <br />
            <Row style={{ marginBottom: "7px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  1.1 Attach your document (see above description):
                  <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                </label>
                <TextInput
                  width="95%"
                  value={Q1_1}
                  callback={(value) => {
                    value = _gf.fixEmptyValue(value, "")
                    this.setState({ Q1_1: value })
                  }}
                  readOnly={true}
                />
              </Col>
            </Row>
            <Row style={{ marginBottom: "7px" }}>
              <Col md="4">
                <FileUpload
                  key={"fu_" + goalId}
                  // value={Q1_1}
                  style={{ marginTop: "-15px", marginBottom: "20px" }}
                  width="100%"
                  callback={(fileInfo) => {
                    this.setState({
                      Q1_1: fileInfo.Link,
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
                  placeHolder='select'
                  callback={(value) => {
                    this.setState({ metaKeywords: value || ''})
                  }}
                />
              </Col>
            </Row>
            <br />

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
            <br />

            {/* <Row style={{ marginLeft: "0px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  Is this a final or draft document?
                </label>
                </Col>
            </Row>
            <Row style={{ marginLeft: "0px"}}>
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

            {/* <Row style={{ marginTop: "7px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  1.2 Please add the details of all of the climate change adaptation or mitigation options
                  or any research options described in your document to the National Climate Change Response Database (NCCRD).
              </label>
                <Button
                  onClick={(username) => { this.setState({ showNCCRD: true }) }}
                  color=""
                  style={{ fontSize: "13px", marginLeft: "0px", backgroundColor: DEAGreen }}
                  size="sm">
                  NCCRD
                </Button>
              </Col>
            </Row>
            <br /> */}

            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold", marginBottom: "0px" }}>
                  1.2 Does the document have a risk and vulnerability assessment?
                </label>
                <br />
                <Button
                  onClick={() => { this.setState({ Q1_3: true }) }}
                  color=""
                  style={{ fontSize: Q1_3 ? "13px" : "10px", marginLeft: "0px", backgroundColor: Q1_3 ? DEAGreen : "grey" }}
                  size="sm">
                  YES
                </Button>
                <Button
                  onClick={() => { this.setState({ Q1_3: false }) }}
                  color=""
                  style={{ fontSize: !Q1_3 ? "13px" : "10px", backgroundColor: !Q1_3 ? DEAGreen : "grey" }}
                  size="sm">
                  NO
                </Button>
              </Col>
            </Row>
            <br />

            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  1.3 When was the plan last updated?
                </label>
              </Col>
            </Row>
            <Row>
              <Col md="5">
                <DateInput
                  value={Q1_4}
                  callback={(dateString) => { this.setState({ Q1_4: dateString }) }}
                  allowClear={false}
                />
              </Col>
            </Row>
            <br />

            <Row>
              <Col md="8">
                <label style={{ fontWeight: "bold" }}>
                  1.4 Select the region where your plan will be implemented. If your plan will be implemented in multiple locations, select the highest geographic level that applies. For example, for locations in multiple provinces select 'national', for locations in multiple district muncipalities in the same province, select the correct province, etc.
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
                        value={Q1_5}
                        callback={(value) => { this.setState({ Q1_5: value.id, metaRegion: value.text }) }}
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
                  1.5 If your organisation is not a South African municipal, district, provincial, or national government entity, specify the name of your organisation.
                </label>
                <TextInput
                  width="95%"
                  value={Q1_6}
                  callback={(value) => {
                    value = _gf.fixEmptyValue(value, "")
                    this.setState({ Q1_6: value })
                  }}
                />
              </Col>
            </Row>

            <Row>
              <Col md="8">
                <label style={{ fontWeight: "bold" }}>
                  1.6 Select the sector your organisation falls under:
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
                        value={Q1_7}
                        callback={(value) => { this.setState({ Q1_7: value.id }) }}
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
              <Col md="12">
                <Button 
                  color="" 
                  size="sm"
                  style={{ marginLeft: "0px", 
                    backgroundColor: DEAGreen, 
                    color: "black", 
                    fontSize: "13px" }}
                  onClick={this.submit}>
                  {editing === true ? "Update" : "Save"}
                </Button>
              </Col>
            </Row>
            {/* </Col>
            </Row> */}
            </Card>
            <br />      
            <Card>
            <Row style={{ marginTop: "7px" }}>
              <Col md="8">
              <h6>Part B</h6>
                <label style={{ fontWeight: "bold" }}>
                  1.7 Please add the details of all of the climate change adaptation or mitigation options
                  or any research options described in your document to the National Climate Change Response Database (NCCRD).
              </label>
              </Col>
              </Row>
              <Row>
                <Col>
                <Button
                  onClick={(username) => { this.setState({ showNCCRD: true }) }}
                  color=""
                  style={{ fontSize: "13px", marginLeft: "0px", backgroundColor: DEAGreen }}
                  size="sm">
                  NCCRD
                </Button>

                </Col>
              </Row>
            </Card>
         
            <br />  
            <Card>
            <Row style={{ marginTop: "15px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold", marginBottom: "0px" }}>
                  Based on your submission, your Goal 1 status is:
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
            <br />
            <Row>
              <Col md="4">
                <Button color="" style={{ marginLeft: "0px", backgroundColor: DEAGreen, color: "black", fontSize: "16px" }}
                  onClick={this.submit}>
                  <b>{editing === true ? "Update" : "Submit"}</b>
                </Button>
              </Col>
            </Row>
            </Card>
          {/* </Col>
        </Row> */}
        <br />

        {showNCCRD && 
          // <NCCRD goalId={goalId} closeCallback={() => { this.setState({ showNCCRD: false }) }} />
          // <NCCRD
          //   query={`?navbar=addOnly&daoid=${goalId}&popin=hidden`}
          //   closeCallback={() => { this.setState({ showNCCRD: false }) }}
          // />
          <NCCRD
            path={'#/projects'}
            query={`?config=${encodeURI(JSON.stringify(NCCRD_Config))}`}
            closeCallback={() => { 
              // console.log("Deleting config cookie")
              _gf.DeleteCookie("NCCRD_CONFIG_TMP")
              this.setState({ showNCCRD: "" }) 
            }}
          />
        }

        {/* Message modal */}
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
                    this.setState({ tmpMetaAuthorName: value })
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

export default connect(mapStateToProps, mapDispatchToProps)(Goal1Contrib)