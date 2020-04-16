let _apiBaseURL = ''
let _siteBaseURL = ''
let _ccrdBaseURL = ''
let _ccrdSiteBaseURL = ''
let _nccisSiteBaseURL = ''
let _ndmcBaseURL = ''
let _ndmcSiteBaseURL = ''
let _vmsBaseURL = ''
let _ssoBaseURL = ''
let _metadataServiceURL = ''
let _mapServerBaseURL = ''

if (CONSTANTS.DEV) {
  // uncomment below for local
  // _apiBaseURL = 'http://localhost:44301/odata/' 
  // _siteBaseURL = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/`
  // _ccrdBaseURL = 'http://localhost:62553/odata/'
  // _ccrdSiteBaseURL = 'http://localhost:8085/#/'
  // _nccisSiteBaseURL = 'http://192.168.105.102/'
  // _ndmcBaseURL = 'http://localhost:44334/odata/'
  // _ndmcSiteBaseURL = 'http://localhost:8080/#/'
  // _vmsBaseURL = 'http://localhost:64161/api/'
  // _ssoBaseURL = 'https://identity.saeon.ac.za/' //'http://localhost:44320/'
  // _metadataServiceURL = 'https://qad.saeoss.org/Institutions/dea-monitoring-and-evaluation/dea-monitoring-and-evaluation/metadata/jsonCreateMetadataAsJson/'
  // _mapServerBaseURL = 'https://ccis.environment.gov.za/map'

  //uncomment below for staging 
  // _apiBaseURL = 'http://192.168.105.102/ndao/api/odata/'
  // _siteBaseURL = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/`
  // _ccrdBaseURL = 'http://192.168.105.102/nccrd/api/odata/'
  // _ccrdSiteBaseURL = 'http://192.168.105.102/nccrd/'
  // _nccisSiteBaseURL = 'http://192.168.105.102/'
  // _ndmcBaseURL = 'http://192.168.105.102/ndmc/api/'
  // _ndmcSiteBaseURL = 'http://192.168.105.102/ndmc/'
  // _vmsBaseURL = 'http://192.168.105.102/vms/api/'
  // _ssoBaseURL = 'https://identity.saeon.ac.za/'
  // _metadataServiceURL = 'https://qad.saeoss.org/Institutions/dea-monitoring-and-evaluation/dea-monitoring-and-evaluation/metadata/jsonCreateMetadataAsJson/'
  // _mapServerBaseURL = 'http://192.168.105.102/map'

  _apiBaseURL = 'https://ccis.environment.gov.za/ndao/api/odata/'
  _siteBaseURL = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/`
  _ccrdBaseURL = 'https://ccis.environment.gov.za/nccrd/api/odata/'
  _ccrdSiteBaseURL = 'https://ccis.environment.gov.za/nccrd/'
  _nccisSiteBaseURL = 'https://ccis.environment.gov.za/'
  _ndmcBaseURL = 'https://ccis.environment.gov.za/nhe/api/odata/'
  _ndmcSiteBaseURL = 'https://ccis.environment.gov.za/nhe/'
  _vmsBaseURL = 'https://ccis.environment.gov.za/vms/api/'
  _ssoBaseURL = 'https://identity.saeon.ac.za/'
  _metadataServiceURL = 'https://qad.saeoss.org/Institutions/dea-monitoring-and-evaluation/dea-monitoring-and-evaluation/metadata/jsonCreateMetadataAsJson/'
  _mapServerBaseURL = 'https://ccis.environment.gov.za/map'

}
else if (CONSTANTS.TEST) {
  _apiBaseURL = 'http://192.168.105.102/ndao/api/odata/'
  _siteBaseURL = 'http://192.168.105.102/ndao/'
  _ccrdBaseURL = 'http://192.168.105.102/nccrd/api/odata/'
  _ccrdSiteBaseURL = 'http://192.168.105.102/nccrd/'
  _nccisSiteBaseURL = 'http://192.168.105.102/'
  _ndmcBaseURL = 'http://192.168.105.102/ndmc/api/'
  _ndmcSiteBaseURL = 'http://192.168.105.102/ndmc/'
  _vmsBaseURL = 'http://192.168.105.102/vms/api/'
  _ssoBaseURL = 'https://identity.saeon.ac.za/'
  _metadataServiceURL = 'https://qad.saeoss.org/Institutions/dea-monitoring-and-evaluation/dea-monitoring-and-evaluation/metadata/jsonCreateMetadataAsJson/'
  _mapServerBaseURL = 'http://192.168.105.102/map'
}
else if (CONSTANTS.PROD) {
    _apiBaseURL = 'http://192.168.105.102/ndao/api/odata/'
    _siteBaseURL = 'http://192.168.105.102/ndao/'
    _ccrdBaseURL = 'http://192.168.105.102/nccrd/api/odata/'
    _ccrdSiteBaseURL = 'http://192.168.105.102/nccrd/'
    _nccisSiteBaseURL = 'http://192.168.105.102/'
    _ndmcBaseURL = 'http://192.168.105.102/ndmc/api/'
    _ndmcSiteBaseURL = 'http://192.168.105.102/ndmc/'
    _vmsBaseURL = 'http://192.168.105.102/vms/api/'
    _ssoBaseURL = 'https://identity.saeon.ac.za/'
    _metadataServiceURL = 'https://qad.saeoss.org/Institutions/dea-monitoring-and-evaluation/dea-monitoring-and-evaluation/metadata/jsonCreateMetadataAsJson/'
    _mapServerBaseURL = 'http://192.168.105.102/map'
  // _apiBaseURL = 'https://ccis.environment.gov.za/ndao/api/odata/'
  // _siteBaseURL = 'https://ccis.environment.gov.za/ndao/'
  // _ccrdBaseURL = 'https://ccis.environment.gov.za/nccrd/api/odata/'
  // _ccrdSiteBaseURL = 'https://ccis.environment.gov.za/nccrd/'
  // _nccisSiteBaseURL = 'https://ccis.environment.gov.za/'
  // _ndmcBaseURL = 'https://ccis.environment.gov.za/nhe/api/odata/'
  // _ndmcSiteBaseURL = 'https://ccis.environment.gov.za/nhe/'
  // _vmsBaseURL = 'https://ccis.environment.gov.za/vms/api/'
  // _ssoBaseURL = 'https://identity.saeon.ac.za/'
  // _metadataServiceURL = 'https://qad.saeoss.org/Institutions/dea-monitoring-and-evaluation/dea-monitoring-and-evaluation/metadata/jsonCreateMetadataAsJson/'
  // _mapServerBaseURL = 'https://ccis.environment.gov.za/map'
}

export const apiBaseURL = _apiBaseURL
export const siteBaseURL = _siteBaseURL
export const ccrdBaseURL = _ccrdBaseURL
export const ccrdSiteBaseURL = _ccrdSiteBaseURL
export const nccisSiteBaseURL = _nccisSiteBaseURL
export const ndmcBaseURL = _ndmcBaseURL
export const ndmcSiteBaseURL = _ndmcSiteBaseURL
export const vmsBaseURL = _vmsBaseURL
export const ssoBaseURL = _ssoBaseURL
export const metadataServiceURL = _metadataServiceURL
export const mapServerBaseURL = _mapServerBaseURL