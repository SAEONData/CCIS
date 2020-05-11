'use strict'

import React from 'react'
import { connect } from 'react-redux'
import { Row, Col, Button, Modal, ModalHeader, ModalBody, ModalFooter, Input, Container } from 'mdbreact'
import TextInput from '../../../input/TextInput.jsx'
import TextAreaInput from '../../../input/TextAreaInput.jsx'
import { DEAGreen, Red, Amber, Green } from '../../../../config/colours.js'
import { apiBaseURL, ccrdBaseURL, vmsBaseURL, metadataServiceURL } from '../../../../../js/config/serviceURLs.js'
import FileUpload from '../../../input/FileUpload.jsx'
import TreeSelectInput from '../../../input/TreeSelectInput.jsx'
import OData from 'react-odata'
import buildQuery from 'odata-query'
import moment from 'moment'
import { metaDocFormatsList } from '../../../../../data/metaDocFormatsList.js'
import { metaKeywordsList } from '../../../../../data/metaKeywordsList.js'
import { metaDataCredentials } from '../../../../../js/secrets.js'

//Ant.D
import Slider from 'antd/lib/slider'
import 'antd/lib/slider/style/css'

//Images
import gear from '../../../../../images/Icons/gear.png'
import checklist from '../../../../../images/Icons/checklist.png'

//Content
import OrganogramTemplate from '../../../../../content/OrganogramTemplate.pptx'
import { CustomFetch } from '../../../../globalFunctions.js';

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
  goalId: _gf.GetUID(),
  Q2_1: false, //DedicatedChampion
  Q2_1_A: "", //DocumentLink
  Q2_2: false, //DedicatedFunding
  Q2_2_A: 1, //TotalBudget
  Q2_2_B: 1, //FundingDuration
  Q2_2_C: 0, //FundingAgency
  Q2_2_D: 0, //PartneringDepartments
  Q2_3: 1, //IncludedInForums
  Q2_4: 0, //Region
  Q2_5: "", //Institution
  Q2_6: 0, //Sector
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
  attachmentDetails: { size: 0, name: "", format: "", version: 0 } //JSON

}

class Goal2Contrib extends React.Component {

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

    let { goalStatus, Q2_1, Q2_1_A, Q2_2, Q2_3 } = this.state
    let newGoalStatus = "R"
    let redPoints = 0
    let amberPoints = 0
    let greenPoints = 0

    //Check red conditions
    if (Q2_1 === false) {
      redPoints += 1
    }
    if (Q2_2 === false) {
      redPoints += 1
    }
    if (Q2_3 === 1) {
      redPoints += 1
    }

    //Check amber conditions
    if (Q2_1 === true) {
      amberPoints += 1
    }
    if (Q2_3 === 2) {
      amberPoints += 1
    }

    //Check green conditions
    if (Q2_1 === true && !_gf.isEmptyValue(Q2_1_A)) {
      greenPoints += 1
    }
    if (Q2_2 === true) {
      greenPoints += 1
    }
    if (Q2_3 === 3) {
      greenPoints += 1
    }

    //Parse result to status colour    
    if (greenPoints === 3) {
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
          Q2_1: data.Questions.filter(x => x.Key === "DedicatedChampion")[0].Value === 'true',
          Q2_1_A: data.Questions.filter(x => x.Key === "DocumentLink")[0].Value,
          Q2_2: data.Questions.filter(x => x.Key === "DedicatedFunding")[0].Value === 'true',
          Q2_2_A: parseInt(data.Questions.filter(x => x.Key === "TotalBudget")[0].Value),
          Q2_2_B: parseInt(data.Questions.filter(x => x.Key === "FundingDuration")[0].Value),
          Q2_2_C: parseInt(data.Questions.filter(x => x.Key === "FundingAgency")[0].Value),
          Q2_2_D: parseInt(data.Questions.filter(x => x.Key === "PartneringDepartments")[0].Value),
          Q2_3: parseInt(data.Questions.filter(x => x.Key === "IncludedInForums")[0].Value),
          Q2_4: parseInt(data.Questions.filter(x => x.Key === "Region")[0].Value),
          Q2_5: data.Questions.filter(x => x.Key === "Institution")[0].Value,
          Q2_6: parseInt(data.Questions.filter(x => x.Key === "Sector")[0].Value),
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

    let { Q2_1 } = this.state
    let { setLoading } = this.props
    setLoading(true)

    let validated = this.validate()
    if (validated) {

      let metaUID = ""
      if (Q2_1 === true) {
        metaUID = await this.generateMetaData()
      }

      if (metaUID !== null) {
        await this.saveGoal(metaUID)
      }

    }

    setLoading(false)
  }

  validate() {

    let { Q2_1, Q2_1_A, metaAuthors, metaDocTitle, metaKeywords, metaDocDescr, metaAgreement } = this.state

    if (Q2_1 === true) {

      if (_gf.isEmptyValue(Q2_1_A)) {
        this.showMessage("Required", "Document attachment required - please attach a document.")
        return false
      }

      if (metaAuthors.length === 0) {
        this.showMessage("Required", "Document author(s) required - please add at least one author.")
        return false
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
      goalId, goalStatus, Q2_1, Q2_1_A, Q2_2, Q2_2_A, Q2_2_B, Q2_2_C, Q2_2_D, Q2_3, Q2_4, Q2_5, Q2_6,
      metaAuthors, metaDocTitle, metaKeywords, metaDocDescr, metaAgreement,
      attachmentDetails, metaRegion
    } = this.state
    let { user } = this.props

    //Construct post body
    let goal = {
      Id: goalId,
      CreateUser: user.profile.UserId,
      Status: goalStatus,
      Type: 2,
      Questions: [
        { Key: "DedicatedChampion", Value: Q2_1.toString() },
        { Key: "DocumentLink", Value: Q2_1_A },
        { Key: "DedicatedFunding", Value: Q2_2.toString() },
        { Key: "TotalBudget", Value: Q2_2_A.toString() },
        { Key: "FundingDuration", Value: Q2_2_B.toString() },
        { Key: "FundingAgency", Value: Q2_2_C.toString() },
        { Key: "PartneringDepartments", Value: Q2_2_D.toString() },
        { Key: "IncludedInForums", Value: Q2_3.toString() },
        { Key: "Region", Value: Q2_4.toString() },
        { Key: "Institution", Value: Q2_5 },
        { Key: "Sector", Value: Q2_6.toString() },
        { Key: "DocumentAuthors", Value: metaAuthors.join("||") },
        { Key: "DocumentTitle", Value: metaDocTitle },
        { Key: "DocumentKeywords", Value: metaKeywords.join("||") },
        { Key: "DocumentDescription", Value: metaDocDescr },
        { Key: "DocumentAgreement", Value: metaAgreement.toString() },
        { Key: "DocumentDetails", Value: JSON.stringify(attachmentDetails) }, //file details as JSON string
        { Key: "RegionName", Value: metaRegion.toString() },
        { Key: "MetaDataUID", Value: metaUID }
        
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

  async generateMetaData() {

    let {
      goalId, Q2_1_A, metaAuthors, metaDocTitle, metaKeywords,
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
            href: Q2_1_A,
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

  showMessage(title, message) {
    this.setState({
      title,
      message,
      messageModal: true
    })
  }

  render() {

    let {
      editing, Q2_1, Q2_1_A, Q2_2, Q2_2_A, Q2_2_B, Q2_2_C, Q2_2_D, Q2_3, Q2_4, Q2_5, Q2_6, goalStatus, goalId,
      metaAddAuthorModal, metaAuthors, tmpMetaAuthorName, tmpMetaAuthorEmail,
      tmpMetaAuthorInstitution, metaDocTitle, metaKeywords, metaDocDescr, metaAgreement
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
              Goal 2. Appropriate resources (including current and past financial investments), capacity and
              processes (human, legal and regulatory) and support mechanisms (institutional and governance
              structures) to facilitate climate change adaptation.
            </h5>
            <p style={{ marginTop: "20px", marginBottom: "2px" }}>
              <b>What is being monitored and evaluated:</b>
            </p>
            <ol style={{ marginLeft: "-15px" }}>
              <li>
                Dedicated climate change champions/nodes/units and funding for businesses, sectors, provinces
                and municipalities (metropolitan, district and local);
              </li>
              <li>
                Climate change training programmes;
              </li>
              <li>
                Inclusion of climate change agendas in business, sectoral, provincial and municipal
                forums/committees (e.g. Climate Change Sustainability Councils, Municipal Climate Change
                Task Teams, Disaster Management Advisory Forums, Ward Councillor meetings, Provincial
                Cluster meetings, Board-level oversight);
              </li>
              <li>
                Implementation of forum/committee climate change action plans; and
              </li>
              <li>
                Dedicated budget/funding (including monetary incentives).
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
                      No dedicated political/administrative champions, capacity, structure (i.e.
                      organogram with climate change key performance indicators or Board-level
                      oversight of climate change) or funding (including monetary incentives);
                      no inclusion of climate change items in existing administrative and
                      political forums/committees in businesses, sectors, provinces and municipalities.
                    </p>
                  </td>
                </tr>
                <tr style={{ backgroundColor: Amber }}>
                  <td style={{ color: "white", padding: "10px" }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>AMBER </b>
                      Political/administrative champions designated but with no capacity, structure
                      (i.e. organogram) or funding; inclusion of climate change items only by request
                      in existing administrative and political forums/committees.
                    </p>
                  </td>
                </tr>
                <tr style={{ backgroundColor: Green }}>
                  <td style={{ color: "white", padding: "10px" }}>
                    <p style={{ marginBottom: "0px" }}>
                      <b>GREEN </b>
                      Political/administrative champions designated, and capacity, structure
                      (i.e. organogram/Board-level oversight) and dedicated funding; climate change
                      standing item in administrative and political provincial, municipal and sector
                      forum/committee agendas.
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
              Goal 2 Assessment
            </h5>
            <br />
            

            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold", marginBottom: "0px", marginRight: "7px" }}>
                  2.1 Does your organisation have a dedicated political/administrative champion with capacity and structure?
                </label>
                <br />
                <div>
                  <Button
                    onClick={() => { this.setState({ Q2_1: true }) }}
                    color=""
                    style={{ fontSize: Q2_1 ? "13px" : "10px", marginLeft: "0px", backgroundColor: Q2_1 ? DEAGreen : "grey" }}
                    size="sm">
                    YES
                  </Button>
                  <Button
                    onClick={() => { this.setState({ Q2_1: false }) }}
                    color=""
                    style={{ fontSize: !Q2_1 ? "13px" : "10px", backgroundColor: !Q2_1 ? DEAGreen : "grey" }}
                    size="sm">
                    NO
                </Button>
                </div>
              </Col>
            </Row>
            <br />

            {
              Q2_1 === true &&
              <div>
                <Row style={{ marginBottom: "7px" }}>
                  <Col md="12">
                    <label style={{ fontWeight: "bold" }}>
                      Attach an organogram representing the structure of your climate change unit:
                      <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                    </label>
                    <br />
                    <a href={OrganogramTemplate}>
                      <p style={{ fontSize: "14px", marginTop: "-8px", marginBottom: "35px" }}>
                        <u>Download Organogram Template</u>
                      </p>
                    </a>
                    {/* <TextInput
                      width="95%"
                      value={Q2_1_A}
                      callback={(value) => {
                        value = _gf.fixEmptyValue(value, "")
                        this.setState({ Q2_1_A: value })
                      }}
                      readOnly={true}
                    /> */}
                  </Col>
                </Row>
                <Row style={{ marginBottom: "7px" }}>
                  <Col md="4">
                    <FileUpload
                      key={"fu_" + goalId}
                      style={{ marginTop: "-15px", marginBottom: "20px" }}
                      width="100%"
                      callback={(fileInfo) => {
                        this.setState({
                          Q2_1_A: fileInfo.Link,
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
                      Who is resonsible for the climate change unit?
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
                      Select all keywords that apply to the work of your climate change unit:
                      <span style={{ color: "red", marginLeft: "10px", fontSize: "20px" }}>*</span>
                    </label>
                    <TreeSelectInput
                      multiple
                      data={metaKeywordsList}
                      transform={(item) => ({ id: item, text: item })}
                      value={metaKeywords}
                      placeHolder={"Unspecified"}
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
                      Briefly describe the purpose of your climate change unit:
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
                {/* <br />
                <Row style={{ marginLeft: "0px" }}>
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
            </Row> */}
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
                <br />
              </div>
            }

            <Row>
              <Col md="12">
                <label style={{ fontWeight: "bold", marginBottom: "0px" }}>
                  2.2 Does your climate change unit have dedicated funding (y/n)?
                </label>
                <br />
                <Button
                  onClick={() => { this.setState({ Q2_2: true }) }}
                  color=""
                  style={{ fontSize: Q2_2 ? "13px" : "10px", marginLeft: "0px", backgroundColor: Q2_2 ? DEAGreen : "grey" }}
                  size="sm">
                  YES
                </Button>
                <Button
                  onClick={() => { this.setState({ Q2_2: false }) }}
                  color=""
                  style={{ fontSize: !Q2_2 ? "13px" : "10px", backgroundColor: !Q2_2 ? DEAGreen : "grey" }}
                  size="sm">
                  NO
                </Button>
              </Col>
            </Row>
            <br />

            {
              Q2_2 === true &&
              <div>
                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="12">
                    <label style={{ fontWeight: "bold" }}>
                      What is the total budget?
                  </label>
                    <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
                      <Row style={{ marginBottom: "-10px" }}>
                        <Col md="2" style={{ textAlign: "left" }}>
                          <a onClick={() => { this.setState({ Q2_2_A: 1 }) }}>0k - 10k</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "left" }}>
                          <a onClick={() => { this.setState({ Q2_2_A: 2 }) }}>10k - 100k</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "center" }}>
                          <a onClick={() => { this.setState({ Q2_2_A: 3 }) }}>100k - 1m</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "center" }}>
                          <a onClick={() => { this.setState({ Q2_2_A: 4 }) }}>1m - 10m</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "right" }}>
                          <a onClick={() => { this.setState({ Q2_2_A: 5 }) }}>10m - 100m</a>
                        </Col>
                        <Col md="2" style={{ textAlign: "right" }}>
                          <a onClick={() => { this.setState({ Q2_2_A: 6 }) }}>> 100m</a>
                        </Col>
                      </Row>
                      <Slider
                        min={1}
                        max={6}
                        value={Q2_2_A}
                        style={{ marginLeft: "15px", marginRight: "15px" }}
                        onChange={(value) => { this.setState({ Q2_2_A: value }) }}
                      />
                    </div>
                  </Col>
                </Row>
                <br />

                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="5">
                    <label style={{ fontWeight: "bold" }}>
                      How long will the funding last (years)?
                  </label>
                    <div style={{ backgroundColor: "#FCFCFC", padding: "10px 15px 5px 15px", borderRadius: "5px", border: "1px solid lightgrey" }} >
                      <Row style={{ marginBottom: "-10px" }}>
                        <Col md="4" style={{ textAlign: "left" }}>
                          <a onClick={() => { this.setState({ Q2_2_B: 1 }) }}>0 - 5</a>
                        </Col>
                        <Col md="4" style={{ textAlign: "center" }}>
                          <a onClick={() => { this.setState({ Q2_2_B: 2 }) }}>5 - 10</a>
                        </Col>
                        <Col md="4" style={{ textAlign: "right" }}>
                          <a onClick={() => { this.setState({ Q2_2_B: 3 }) }}>> 10</a>
                        </Col>
                      </Row>
                      <Slider
                        min={1}
                        max={3}
                        value={Q2_2_B}
                        style={{ marginLeft: "15px", marginRight: "15px" }}
                        onChange={(value) => { this.setState({ Q2_2_B: value }) }}
                      />
                    </div>
                  </Col>
                </Row>
                <br />

                <Row style={{ marginBottom: "7px", marginLeft: "0px" }}>
                  <Col md="8">
                    <label style={{ fontWeight: "bold" }}>
                      Who is the funding agency?
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
                            value={Q2_2_C}
                            callback={(value) => { this.setState({ Q2_2_C: value.id }) }}
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
                      Are there any partnering departments/organisations that share the costs?
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
                            value={Q2_2_D}
                            callback={(value) => { this.setState({ Q2_2_D: value.id }) }}
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

            <Row style={{ marginBottom: "15px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold" }}>
                  2.3 Are climate change items included in existing administrative and political
                  forums/committees in businesses, sectors, provinces and municipalities?
                </label>
                <div style={{ marginLeft: "-22px", marginTop: "-10px" }}>
                  <Input
                    onClick={() => { this.setState({ Q2_3: 1 }) }}
                    checked={Q2_3 === 1 ? true : false}
                    label="No."
                    type="radio"
                    id="radFC1"
                  />
                  <Input
                    onClick={() => { this.setState({ Q2_3: 2 }) }}
                    checked={Q2_3 === 2 ? true : false}
                    label="Only by request in existing administrative and political forums/committees."
                    type="radio"
                    id="radFC2"
                  />
                  <Input
                    onClick={() => { this.setState({ Q2_3: 3 }) }}
                    checked={Q2_3 === 3 ? true : false}
                    label="Climate change in a standing item in administrative and political provincial, municipal and sector forum/committee agendas."
                    type="radio"
                    id="radFC3"
                  />
                </div>
              </Col>
            </Row>

            <Row>
              <Col md="8">
                <label style={{ fontWeight: "bold" }}>
                  2.4 Select a region for your organisation. If the climate change unit of your organisation impacts multiple offices, select the highest geographic level that applies. For example, for locations in multiple provinces select 'national', for locations in multiple district muncipalities in the same province, select the correct province, etc.:
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
                        value={Q2_4}
                        callback={(value) => { this.setState({ Q2_4: value.id, metaRegion: value.text }) }}
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
                  2.5 If your organisation is not a South African municipal, district, provincial, or national government entity, specify the name of your organisation.
                </label>
                <TextInput
                  width="95%"
                  value={Q2_5}
                  callback={(value) => {
                    value = _gf.fixEmptyValue(value, "")
                    this.setState({ Q2_5: value })
                  }}
                />
              </Col>
            </Row>

            <Row>
              <Col md="8">
                <label style={{ fontWeight: "bold" }}>
                  2.6 Select the sector your organisation:
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
                        value={Q2_6}
                        callback={(value) => { this.setState({ Q2_6: value.id }) }}
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
                <Button
                  color=""
                  style={{
                    marginLeft: "0px",
                    marginTop: "15px",
                    backgroundColor: DEAGreen,
                    color: "black",
                    fontSize: "16px"
                  }}
                  onClick={this.submit} >
                  <b>{editing === true ? "Update" : "Save"}</b>
                </Button>
              </Col>
            </Row>

            <Row style={{ marginTop: "15px" }}>
              <Col md="12">
                <label style={{ fontWeight: "bold", marginBottom: "0px" }}>
                  Based on your submission, your Goal 2 status is:
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

export default connect(mapStateToProps, mapDispatchToProps)(Goal2Contrib)