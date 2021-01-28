var fs = require('fs');
var chai = require('chai')
var chaiHttp = require('chai-http');
chai.use(chaiHttp);
var expect = require('chai').expect;
const YAML = require('yaml')
const process = require('process')
const COMPONENT = 'component';
const k8s = require('@kubernetes/client-node');
const http = require('http');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

console.log("***************************************************************************");
console.log("Open Digital Architecture - Component Test Kit CTK Dynamic Tests");
console.log("***************************************************************************");
console.log();
var components = process.env.components.split(',');

for (index in components) {

  componentEnvelopeName = components[index];

  var documentArray = [];
  const file = fs.readFileSync(componentEnvelopeName, 'utf8')


  describe('Step 0: Basic environment connectivity tests', function() {

    it("Kubectl configured correctly", function(done) {
      const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
      const k8sCustomApi = kc.makeApiClient(k8s.CustomObjectsApi);   
      k8sCoreApi.listNamespacedPod('components').then((res) => {
        expect(res,"Kubectl should return pods in 'components' namespace").to.be.a('object');
        done();
      });
    });
  });

  describe('Step 1: Check metadata for component ' + componentEnvelopeName, function() {

    const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    const k8sCustomApi = kc.makeApiClient(k8s.CustomObjectsApi); 

    it("Component can be found", function(done) {
      documentArray = YAML.parseAllDocuments(file)
      var componentDoc = getComponentDocument(documentArray);
      var metadata = componentDoc.get('metadata');
      var componentName = metadata.get('name');
      
      k8sCustomApi.listNamespacedCustomObject('oda.tmforum.org', 'v1alpha1', 'components', 'components', undefined, undefined, 'metadata.name=' + componentName)
        .then(function(res) {
          var numberOfComponentsFound = res.body.items.length;
          expect(numberOfComponentsFound ,"Should find 1 component with name "+componentName).to.equal(1);
          done();
        }).catch(done);
    });

    
    it("Component has deployed successfully (deployment_status: Complete)", function(done) {
      documentArray = YAML.parseAllDocuments(file)
      var componentDoc = getComponentDocument(documentArray);
      var metadata = componentDoc.get('metadata');
      var componentName = metadata.get('name');
      k8sCustomApi.listNamespacedCustomObject('oda.tmforum.org', 'v1alpha1', 'components', 'components', undefined, undefined, 'metadata.name=' + componentName)
        .then(function(res) {
          var status = res.body.items[0].status;
          expect(status.deployment_status ,"status.deployment_status is Complete").to.equal("Complete");
          done();
        }).catch(done);
    });

});

// get list of exposed APIs
const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sCustomApi = kc.makeApiClient(k8s.CustomObjectsApi); 
documentArray = YAML.parseAllDocuments(file)
var componentDoc = getComponentDocument(documentArray);
var metadata = componentDoc.get('metadata');
var componentName = metadata.get('name');
k8sCustomApi.listNamespacedCustomObject('oda.tmforum.org', 'v1alpha1', 'components', 'components', undefined, undefined,
  'metadata.name=' + componentName)
  .then(function(res) {
    var status = res.body.items[0].status;
    exposedAPIList = status.exposedAPIs;
    for(var apiKey in exposedAPIList) {
      describe('Step 2(' + apiKey + '): Run-time test of exposed API: ' + exposedAPIList[apiKey].name, function() {
        it("endpoints give HTTP 200 response", function(done) {
          expect(exposedAPIList[apiKey].url,'status.exposedAPI[' + apiKey + '].url should be a string').to.be.a('string');
          var server = exposedAPIList[apiKey].url.split('/')[0];
          var apiPath = '/' + exposedAPIList[0].url.split(/\/(.+)/)[1];
          chai.request('http://' + server)
            .get(apiPath)
            .end(function(err, res) {
              expect(res).to.have.status(200);
              done();                               // <= Call done to signal callback end
            });
          });
        });
      }

    });
}




function getComponentDocument(inDocumentArray) {
  // go through each document checking for a kind: component
  for(var docKey in inDocumentArray){
    if (inDocumentArray[docKey].get('kind') == COMPONENT) {
      return inDocumentArray[docKey] 
    }
  }
  return null;
};


function checkKubeconfig() {


  


  /*

  k8sCustomApi.listNamespacedCustomObject('oda.tmforum.org', 'v1alpha1', 'bos-default', 'components')
    .then((res) => {
      console.log(res.body.items);
    });
  
  */
  // resp = k8sClient.getNamespacedCustomObjectStatus('api.yourorg.io', apiVersion', namespace, crdKind, objName)
  

}

  

