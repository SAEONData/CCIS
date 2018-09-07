'use strict'

import React from 'react'
import { connect } from 'react-redux'
import { Container, Button, Collapse, Row, Col } from 'mdbreact'
import SelectInput from '../../../input/SelectInput.jsx'

import { DEAGreen } from '../../../../config/colours.cfg'
import About from './About.jsx'

import Goal1Contrib from './Goal1Contrib.jsx'
import Goal2Contrib from './Goal2Contrib.jsx'
import Goal3Contrib from './Goal3Contrib.jsx'
import Goal4Contrib from './Goal4Contrib.jsx'
import Goal5Contrib from './Goal5Contrib.jsx'
import Goal6Contrib from './Goal6Contrib.jsx'
import Goal7Contrib from './Goal7Contrib.jsx'
import Goal8Contrib from './Goal8Contrib.jsx'
import Goal9Contrib from './Goal9Contrib.jsx'

const mapStateToProps = (state, props) => {
  return {}
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateNav: payload => {
      dispatch({ type: "NAV", payload })
    }
  }
}

class AME extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      aboutSection: true,
      contribSection: false,
      selectedGoal: "Goal 1"
    }
  }

  componentDidMount() {
    this.props.updateNav(location.hash)
  }

  render() {

    let { aboutSection, contribSection, selectedGoal } = this.state

    return (
      <>
        <Container>
          <br />
          <h3><b>Climate Change Adaptation Monitoring and Evaluation</b></h3>
          <br />

          {/* ABOUT */}
          <h5
            style={{ marginBottom: "0px", color: DEAGreen, cursor: "pointer" }}
            onClick={() => { this.setState({ aboutSection: !aboutSection }) }} >
            <b>About this platform...</b>
            &nbsp;&nbsp;&nbsp;
            <i className={!aboutSection ? 'fa fa-angle-down rotate-icon' : 'fa fa-angle-up'}></i>
          </h5>

          <Collapse isOpen={aboutSection}>
            <hr />
            <About />
            <hr style={{ marginBottom: "-10px" }} />
          </Collapse>

          <br />
          <Button
            onClick={() => {
              window.scroll({
                top: 180,
                left: 0,
                behavior: 'smooth'
              });
              setTimeout(() => { this.setState({ contribSection: true, aboutSection: false }) }, 50);
            }}
            style={{ marginLeft: "0px" }}
            color="grey">Submit your contribution</Button>
          <br />

          <Collapse isOpen={contribSection}>
            <br />
            <Row>
              <Col md="4">
                <SelectInput
                  placeHolder="Select Goal..."
                  value={selectedGoal}
                  data={[
                    { id: 1, text: "Goal 1" },
                    { id: 2, text: "Goal 2" },
                    { id: 3, text: "Goal 3" },
                    { id: 4, text: "Goal 4" },
                    { id: 5, text: "Goal 5" },
                    { id: 6, text: "Goal 6" },
                    { id: 7, text: "Goal 7" },
                    { id: 8, text: "Goal 8" },
                    { id: 9, text: "Goal 9" }
                  ]}
                  allowEdit={true}
                  callback={(selectedNode) => { this.setState({ selectedGoal: selectedNode.text }) }}
                />
              </Col>
            </Row>
            <br />
            <Row>
              {selectedGoal === "Goal 1" && <Goal1Contrib />}
              {selectedGoal === "Goal 2" && <Goal2Contrib />}
              {selectedGoal === "Goal 3" && <Goal3Contrib />}
              {selectedGoal === "Goal 4" && <Goal4Contrib />}
              {selectedGoal === "Goal 5" && <Goal5Contrib />}
              {selectedGoal === "Goal 6" && <Goal6Contrib />}
              {selectedGoal === "Goal 7" && <Goal7Contrib />}
              {selectedGoal === "Goal 8" && <Goal8Contrib />}
              {selectedGoal === "Goal 9" && <Goal9Contrib />}
            </Row>
          </Collapse>


        </Container>
      </>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(AME)