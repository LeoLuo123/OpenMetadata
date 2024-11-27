package org.openmetadata.service.search.indexes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.SneakyThrows;
import org.openmetadata.schema.entity.data.Table;
import org.openmetadata.schema.tests.TestCase;
import org.openmetadata.schema.tests.TestDefinition;
import org.openmetadata.schema.tests.TestSuite;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.feeds.MessageParser;
import org.openmetadata.service.resources.feeds.MessageParser.EntityLink;
import org.openmetadata.service.search.SearchIndexUtils;
import org.openmetadata.service.search.models.SearchSuggest;
import org.openmetadata.service.util.FullyQualifiedName;

public record TestCaseIndex(TestCase testCase) implements SearchIndex {
  private static final Set<String> excludeFields = Set.of("changeDescription", "failedRowsSample");

  @Override
  public Object getEntity() {
    return testCase;
  }

  @Override
  public void removeNonIndexableFields(Map<String, Object> esDoc) {
    SearchIndex.super.removeNonIndexableFields(esDoc);
    List<Map<String, Object>> testSuites = (List<Map<String, Object>>) esDoc.get("testSuites");
    if (testSuites != null) {
      for (Map<String, Object> testSuite : testSuites) {
        SearchIndexUtils.removeNonIndexableFields(testSuite, excludeFields);
      }
    }
  }

  @SneakyThrows
  public Map<String, Object> buildSearchIndexDocInternal(Map<String, Object> doc) {
    // Build Index Doc
    List<SearchSuggest> suggest = new ArrayList<>();
    TestDefinition testDefinition =
        Entity.getEntity(
            Entity.TEST_DEFINITION, testCase.getTestDefinition().getId(), "", Include.ALL);
    suggest.add(SearchSuggest.builder().input(testCase.getFullyQualifiedName()).weight(5).build());
    suggest.add(SearchSuggest.builder().input(testCase.getName()).weight(10).build());
    doc.put(
        "fqnParts",
        getFQNParts(
            testCase.getFullyQualifiedName(),
            suggest.stream().map(SearchSuggest::getInput).toList()));
    doc.put("suggest", suggest);
    doc.put("entityType", Entity.TEST_CASE);
    doc.put("owners", getEntitiesWithDisplayName(testCase.getOwners()));
    doc.put("tags", testCase.getTags());
    doc.put("testPlatforms", testDefinition.getTestPlatforms());
    doc.put("dataQualityDimension", testDefinition.getDataQualityDimension());
    doc.put("followers", SearchIndexUtils.parseFollowers(testCase.getFollowers()));
    doc.put("testCaseType", testDefinition.getEntityType());
    doc.put(
        "originEntityFQN", MessageParser.EntityLink.parse(testCase.getEntityLink()).getEntityFQN());
    setParentRelationships(doc, testCase);
    addExecutableEntityReference(testCase.getEntityLink(), doc);
    return doc;
  }

  private void setParentRelationships(Map<String, Object> doc, TestCase testCase) {
    // denormalize the parent relationships for search
    // TODO: process this for all test suites
    EntityReference testSuiteEntityReference = testCase.getTestSuites().get(0);
    if (testSuiteEntityReference == null) {
      return;
    }
    TestSuite testSuite = Entity.getEntityOrNull(testSuiteEntityReference, "", Include.ALL);
    EntityReference entityReference = testSuite.getExecutableEntityReference();
    TestSuiteIndex.addTestSuiteParentEntityRelations(entityReference, doc);
  }

  protected static void addExecutableEntityReference(String entityLink, Map<String, Object> doc) {
    EntityLink entityFQN = EntityLink.parse(entityLink);
    String tableFQN =
        entityFQN.getEntityType().equals("column")
            ? FullyQualifiedName.getTableFQN(entityFQN.getEntityFQN())
            : entityFQN.getEntityFQN();
    Table table = Entity.getEntityByName(Entity.TABLE, tableFQN, "", Include.ALL);
    doc.put("table", table.getEntityReference());
    doc.put("database", table.getDatabase());
    doc.put("databaseSchema", table.getDatabaseSchema());
    doc.put("service", table.getService());
  }

  public static Map<String, Float> getFields() {
    Map<String, Float> fields = SearchIndex.getDefaultFields();
    fields.put("testSuites.fullyQualifiedName", 10.0f);
    fields.put("testSuites.name", 10.0f);
    fields.put("testSuites.description", 1.0f);
    fields.put("entityLink", 3.0f);
    fields.put("entityFQN", 10.0f);
    return fields;
  }
}
