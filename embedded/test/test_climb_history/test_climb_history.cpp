/**
 * Unit Tests for Climb History Library
 *
 * Tests the circular buffer climb history management including
 * adding climbs, history shifting, duplicate detection, clearing,
 * bounds checking, and edge cases.
 *
 * Note: NVS persistence (save/load) is tested indirectly through addClimb()
 * which calls save() automatically. Full deserialization tests require
 * enhanced ArduinoJson mock support for root-level arrays.
 */

#include <Preferences.h>

#include <climb_history.h>
#include <cstring>
#include <unity.h>

void setUp(void) {
    Preferences::resetAll();  // Clear all mock storage between tests
    ClimbHistoryMgr.clear();  // Clear history state
}

void tearDown(void) {
    // Nothing to clean up
}

// =============================================================================
// Basic Add/Get Tests
// =============================================================================

void test_addClimb_and_getCurrentClimb(void) {
    ClimbHistoryMgr.addClimb("Test Climb", "V5", "uuid-123");

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_NOT_NULL(climb);
    TEST_ASSERT_EQUAL_STRING("Test Climb", climb->name);
    TEST_ASSERT_EQUAL_STRING("V5", climb->grade);
    TEST_ASSERT_EQUAL_STRING("uuid-123", climb->uuid);
    TEST_ASSERT_TRUE(climb->valid);
}

void test_hasCurrentClimb_false_when_empty(void) {
    TEST_ASSERT_FALSE(ClimbHistoryMgr.hasCurrentClimb());
}

void test_hasCurrentClimb_true_after_add(void) {
    ClimbHistoryMgr.addClimb("Climb", "V3", "uuid-1");
    TEST_ASSERT_TRUE(ClimbHistoryMgr.hasCurrentClimb());
}

void test_getCurrentClimb_null_when_empty(void) {
    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_NULL(climb);
}

void test_getCount_returns_zero_when_empty(void) {
    TEST_ASSERT_EQUAL(0, ClimbHistoryMgr.getCount());
}

void test_getCount_increments_with_adds(void) {
    ClimbHistoryMgr.addClimb("Climb 1", "V1", "uuid-1");
    TEST_ASSERT_EQUAL(1, ClimbHistoryMgr.getCount());

    ClimbHistoryMgr.addClimb("Climb 2", "V2", "uuid-2");
    TEST_ASSERT_EQUAL(2, ClimbHistoryMgr.getCount());

    ClimbHistoryMgr.addClimb("Climb 3", "V3", "uuid-3");
    TEST_ASSERT_EQUAL(3, ClimbHistoryMgr.getCount());
}

void test_addClimb_sets_valid_flag(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    const ClimbEntry* climb = ClimbHistoryMgr.getClimb(0);
    TEST_ASSERT_NOT_NULL(climb);
    TEST_ASSERT_TRUE(climb->valid);
}

// =============================================================================
// History Shifting Tests
// =============================================================================

void test_history_shifts_down_when_new_climb_added(void) {
    ClimbHistoryMgr.addClimb("First", "V1", "uuid-1");
    ClimbHistoryMgr.addClimb("Second", "V2", "uuid-2");

    const ClimbEntry* current = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_EQUAL_STRING("Second", current->name);

    const ClimbEntry* previous = ClimbHistoryMgr.getClimb(1);
    TEST_ASSERT_NOT_NULL(previous);
    TEST_ASSERT_EQUAL_STRING("First", previous->name);
}

void test_history_maintains_order(void) {
    ClimbHistoryMgr.addClimb("Climb 1", "V1", "uuid-1");
    ClimbHistoryMgr.addClimb("Climb 2", "V2", "uuid-2");
    ClimbHistoryMgr.addClimb("Climb 3", "V3", "uuid-3");
    ClimbHistoryMgr.addClimb("Climb 4", "V4", "uuid-4");

    TEST_ASSERT_EQUAL_STRING("Climb 4", ClimbHistoryMgr.getClimb(0)->name);
    TEST_ASSERT_EQUAL_STRING("Climb 3", ClimbHistoryMgr.getClimb(1)->name);
    TEST_ASSERT_EQUAL_STRING("Climb 2", ClimbHistoryMgr.getClimb(2)->name);
    TEST_ASSERT_EQUAL_STRING("Climb 1", ClimbHistoryMgr.getClimb(3)->name);
}

void test_history_preserves_grades_during_shift(void) {
    ClimbHistoryMgr.addClimb("A", "V1", "uuid-1");
    ClimbHistoryMgr.addClimb("B", "V5", "uuid-2");
    ClimbHistoryMgr.addClimb("C", "V10", "uuid-3");

    TEST_ASSERT_EQUAL_STRING("V10", ClimbHistoryMgr.getClimb(0)->grade);
    TEST_ASSERT_EQUAL_STRING("V5", ClimbHistoryMgr.getClimb(1)->grade);
    TEST_ASSERT_EQUAL_STRING("V1", ClimbHistoryMgr.getClimb(2)->grade);
}

void test_history_preserves_uuids_during_shift(void) {
    ClimbHistoryMgr.addClimb("A", "V1", "uuid-aaa");
    ClimbHistoryMgr.addClimb("B", "V2", "uuid-bbb");

    TEST_ASSERT_EQUAL_STRING("uuid-bbb", ClimbHistoryMgr.getClimb(0)->uuid);
    TEST_ASSERT_EQUAL_STRING("uuid-aaa", ClimbHistoryMgr.getClimb(1)->uuid);
}

void test_history_limits_to_max(void) {
    for (int i = 0; i < 7; i++) {
        char name[32];
        char uuid[32];
        snprintf(name, sizeof(name), "Climb %d", i);
        snprintf(uuid, sizeof(uuid), "uuid-%d", i);
        ClimbHistoryMgr.addClimb(name, "V1", uuid);
    }

    TEST_ASSERT_EQUAL(MAX_CLIMB_HISTORY, ClimbHistoryMgr.getCount());
    TEST_ASSERT_EQUAL_STRING("Climb 6", ClimbHistoryMgr.getClimb(0)->name);
    TEST_ASSERT_EQUAL_STRING("Climb 2", ClimbHistoryMgr.getClimb(MAX_CLIMB_HISTORY - 1)->name);
}

void test_oldest_entry_discarded_on_overflow(void) {
    for (int i = 0; i < MAX_CLIMB_HISTORY; i++) {
        char name[32];
        char uuid[32];
        snprintf(name, sizeof(name), "Climb %d", i);
        snprintf(uuid, sizeof(uuid), "uuid-%d", i);
        ClimbHistoryMgr.addClimb(name, "V1", uuid);
    }
    TEST_ASSERT_EQUAL(MAX_CLIMB_HISTORY, ClimbHistoryMgr.getCount());

    ClimbHistoryMgr.addClimb("New Climb", "V2", "uuid-new");
    TEST_ASSERT_EQUAL(MAX_CLIMB_HISTORY, ClimbHistoryMgr.getCount());
    TEST_ASSERT_EQUAL_STRING("New Climb", ClimbHistoryMgr.getClimb(0)->name);

    // "Climb 0" should have been pushed out
    for (int i = 0; i < MAX_CLIMB_HISTORY; i++) {
        const ClimbEntry* entry = ClimbHistoryMgr.getClimb(i);
        TEST_ASSERT_NOT_NULL(entry);
        TEST_ASSERT_TRUE(strcmp(entry->name, "Climb 0") != 0);
    }
}

void test_fill_exactly_to_max(void) {
    for (int i = 0; i < MAX_CLIMB_HISTORY; i++) {
        char name[32];
        char uuid[32];
        snprintf(name, sizeof(name), "Climb %d", i);
        snprintf(uuid, sizeof(uuid), "uuid-%d", i);
        ClimbHistoryMgr.addClimb(name, "V1", uuid);
    }
    TEST_ASSERT_EQUAL(MAX_CLIMB_HISTORY, ClimbHistoryMgr.getCount());

    // All slots should be valid
    for (int i = 0; i < MAX_CLIMB_HISTORY; i++) {
        TEST_ASSERT_NOT_NULL(ClimbHistoryMgr.getClimb(i));
    }
}

// =============================================================================
// Update Existing Climb Tests
// =============================================================================

void test_same_uuid_updates_instead_of_shifts(void) {
    ClimbHistoryMgr.addClimb("Original Name", "V3", "uuid-same");
    ClimbHistoryMgr.addClimb("Updated Name", "V4", "uuid-same");

    TEST_ASSERT_EQUAL(1, ClimbHistoryMgr.getCount());

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_EQUAL_STRING("Updated Name", climb->name);
    TEST_ASSERT_EQUAL_STRING("V4", climb->grade);
    TEST_ASSERT_EQUAL_STRING("uuid-same", climb->uuid);
}

void test_update_only_applies_to_current(void) {
    ClimbHistoryMgr.addClimb("First", "V1", "uuid-1");
    ClimbHistoryMgr.addClimb("Second", "V2", "uuid-2");

    // uuid-1 is in position 1 (not current), so this creates a new entry
    ClimbHistoryMgr.addClimb("New Climb", "V3", "uuid-1");

    TEST_ASSERT_EQUAL(3, ClimbHistoryMgr.getCount());
    TEST_ASSERT_EQUAL_STRING("New Climb", ClimbHistoryMgr.getClimb(0)->name);
}

void test_update_preserves_uuid(void) {
    ClimbHistoryMgr.addClimb("Name 1", "V1", "uuid-same");
    ClimbHistoryMgr.addClimb("Name 2", "V2", "uuid-same");

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_EQUAL_STRING("uuid-same", climb->uuid);
}

void test_update_with_null_grade_preserves_old_grade(void) {
    ClimbHistoryMgr.addClimb("Climb", "V5", "uuid-1");
    ClimbHistoryMgr.addClimb("Updated", nullptr, "uuid-1");

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_EQUAL_STRING("Updated", climb->name);
    // Grade should be preserved (null means "don't change")
    TEST_ASSERT_EQUAL_STRING("V5", climb->grade);
}

void test_multiple_updates_same_uuid(void) {
    ClimbHistoryMgr.addClimb("V1", "V1", "uuid-1");
    ClimbHistoryMgr.addClimb("V2", "V2", "uuid-1");
    ClimbHistoryMgr.addClimb("V3", "V3", "uuid-1");

    TEST_ASSERT_EQUAL(1, ClimbHistoryMgr.getCount());
    TEST_ASSERT_EQUAL_STRING("V3", ClimbHistoryMgr.getCurrentClimb()->name);
}

// =============================================================================
// Clear Current Tests
// =============================================================================

void test_clearCurrent_marks_no_current(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    TEST_ASSERT_TRUE(ClimbHistoryMgr.hasCurrentClimb());

    ClimbHistoryMgr.clearCurrent();
    TEST_ASSERT_FALSE(ClimbHistoryMgr.hasCurrentClimb());
}

void test_clearCurrent_keeps_history(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    ClimbHistoryMgr.clearCurrent();

    TEST_ASSERT_EQUAL(1, ClimbHistoryMgr.getCount());

    const ClimbEntry* climb = ClimbHistoryMgr.getClimb(0);
    TEST_ASSERT_NOT_NULL(climb);
    TEST_ASSERT_EQUAL_STRING("Climb", climb->name);
}

void test_getCurrentClimb_null_after_clearCurrent(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    ClimbHistoryMgr.clearCurrent();

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_NULL(climb);
}

void test_clearCurrent_when_empty_does_not_crash(void) {
    ClimbHistoryMgr.clearCurrent();
    TEST_ASSERT_FALSE(ClimbHistoryMgr.hasCurrentClimb());
}

void test_addClimb_after_clearCurrent_becomes_new_current(void) {
    ClimbHistoryMgr.addClimb("First", "V1", "uuid-1");
    ClimbHistoryMgr.clearCurrent();
    TEST_ASSERT_FALSE(ClimbHistoryMgr.hasCurrentClimb());

    ClimbHistoryMgr.addClimb("Second", "V2", "uuid-2");
    TEST_ASSERT_TRUE(ClimbHistoryMgr.hasCurrentClimb());

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_EQUAL_STRING("Second", climb->name);
}

void test_clearCurrent_then_update_same_uuid(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    ClimbHistoryMgr.clearCurrent();

    // After clearCurrent, hasCurrentClimb_ is false, so same uuid
    // should NOT match and should create a new entry
    ClimbHistoryMgr.addClimb("New", "V2", "uuid-1");
    TEST_ASSERT_TRUE(ClimbHistoryMgr.hasCurrentClimb());
    TEST_ASSERT_EQUAL_STRING("New", ClimbHistoryMgr.getCurrentClimb()->name);
}

// =============================================================================
// Get Climb By Index Tests
// =============================================================================

void test_getClimb_returns_null_for_negative_index(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    TEST_ASSERT_NULL(ClimbHistoryMgr.getClimb(-1));
}

void test_getClimb_returns_null_for_out_of_bounds_index(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    TEST_ASSERT_NULL(ClimbHistoryMgr.getClimb(MAX_CLIMB_HISTORY));
}

void test_getClimb_returns_null_for_empty_slot(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    TEST_ASSERT_NULL(ClimbHistoryMgr.getClimb(1));
}

void test_getClimb_returns_null_for_large_negative_index(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    TEST_ASSERT_NULL(ClimbHistoryMgr.getClimb(-100));
}

void test_getClimb_returns_null_for_large_positive_index(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");
    TEST_ASSERT_NULL(ClimbHistoryMgr.getClimb(1000));
}

void test_getClimb_index_0_same_as_getCurrentClimb(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", "uuid-1");

    const ClimbEntry* byIndex = ClimbHistoryMgr.getClimb(0);
    const ClimbEntry* current = ClimbHistoryMgr.getCurrentClimb();

    TEST_ASSERT_NOT_NULL(byIndex);
    TEST_ASSERT_NOT_NULL(current);
    TEST_ASSERT_EQUAL_STRING(current->name, byIndex->name);
    TEST_ASSERT_EQUAL_STRING(current->uuid, byIndex->uuid);
}

// =============================================================================
// Edge Cases
// =============================================================================

void test_addClimb_with_null_name_is_ignored(void) {
    ClimbHistoryMgr.addClimb(nullptr, "V1", "uuid-1");
    TEST_ASSERT_EQUAL(0, ClimbHistoryMgr.getCount());
}

void test_addClimb_with_null_uuid_is_ignored(void) {
    ClimbHistoryMgr.addClimb("Climb", "V1", nullptr);
    TEST_ASSERT_EQUAL(0, ClimbHistoryMgr.getCount());
}

void test_addClimb_with_null_grade_is_ok(void) {
    ClimbHistoryMgr.addClimb("Climb", nullptr, "uuid-1");
    TEST_ASSERT_EQUAL(1, ClimbHistoryMgr.getCount());

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_EQUAL_STRING("", climb->grade);
}

void test_addClimb_truncates_long_name(void) {
    char longName[100];
    memset(longName, 'A', sizeof(longName) - 1);
    longName[sizeof(longName) - 1] = '\0';

    ClimbHistoryMgr.addClimb(longName, "V1", "uuid-1");

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_TRUE(strlen(climb->name) < MAX_CLIMB_NAME_LEN);
    TEST_ASSERT_EQUAL(MAX_CLIMB_NAME_LEN - 1, strlen(climb->name));
}

void test_addClimb_truncates_long_grade(void) {
    char longGrade[50];
    memset(longGrade, 'B', sizeof(longGrade) - 1);
    longGrade[sizeof(longGrade) - 1] = '\0';

    ClimbHistoryMgr.addClimb("Climb", longGrade, "uuid-1");

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_TRUE(strlen(climb->grade) < MAX_CLIMB_GRADE_LEN);
    TEST_ASSERT_EQUAL(MAX_CLIMB_GRADE_LEN - 1, strlen(climb->grade));
}

void test_addClimb_truncates_long_uuid(void) {
    char longUuid[80];
    memset(longUuid, 'C', sizeof(longUuid) - 1);
    longUuid[sizeof(longUuid) - 1] = '\0';

    ClimbHistoryMgr.addClimb("Climb", "V1", longUuid);

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_TRUE(strlen(climb->uuid) < MAX_CLIMB_UUID_LEN);
    TEST_ASSERT_EQUAL(MAX_CLIMB_UUID_LEN - 1, strlen(climb->uuid));
}

void test_addClimb_with_empty_strings(void) {
    ClimbHistoryMgr.addClimb("", "", "");
    TEST_ASSERT_EQUAL(1, ClimbHistoryMgr.getCount());

    const ClimbEntry* climb = ClimbHistoryMgr.getCurrentClimb();
    TEST_ASSERT_EQUAL_STRING("", climb->name);
    TEST_ASSERT_EQUAL_STRING("", climb->grade);
    TEST_ASSERT_EQUAL_STRING("", climb->uuid);
}

void test_clear_removes_all_history(void) {
    ClimbHistoryMgr.addClimb("Climb 1", "V1", "uuid-1");
    ClimbHistoryMgr.addClimb("Climb 2", "V2", "uuid-2");
    TEST_ASSERT_EQUAL(2, ClimbHistoryMgr.getCount());

    ClimbHistoryMgr.clear();

    TEST_ASSERT_EQUAL(0, ClimbHistoryMgr.getCount());
    TEST_ASSERT_FALSE(ClimbHistoryMgr.hasCurrentClimb());
    TEST_ASSERT_NULL(ClimbHistoryMgr.getCurrentClimb());
}

void test_clear_when_already_empty(void) {
    ClimbHistoryMgr.clear();
    TEST_ASSERT_EQUAL(0, ClimbHistoryMgr.getCount());
}

void test_climb_entry_default_constructor(void) {
    ClimbEntry entry;
    TEST_ASSERT_FALSE(entry.valid);
    TEST_ASSERT_EQUAL_STRING("", entry.name);
    TEST_ASSERT_EQUAL_STRING("", entry.grade);
    TEST_ASSERT_EQUAL_STRING("", entry.uuid);
}

void test_rapid_add_clear_cycles(void) {
    for (int cycle = 0; cycle < 3; cycle++) {
        for (int i = 0; i < MAX_CLIMB_HISTORY; i++) {
            char name[32];
            char uuid[32];
            snprintf(name, sizeof(name), "C%d-%d", cycle, i);
            snprintf(uuid, sizeof(uuid), "u%d-%d", cycle, i);
            ClimbHistoryMgr.addClimb(name, "V1", uuid);
        }
        TEST_ASSERT_EQUAL(MAX_CLIMB_HISTORY, ClimbHistoryMgr.getCount());
        ClimbHistoryMgr.clear();
        TEST_ASSERT_EQUAL(0, ClimbHistoryMgr.getCount());
    }
}

void test_add_after_clear_starts_fresh(void) {
    ClimbHistoryMgr.addClimb("Old", "V1", "uuid-old");
    ClimbHistoryMgr.clear();

    ClimbHistoryMgr.addClimb("New", "V2", "uuid-new");
    TEST_ASSERT_EQUAL(1, ClimbHistoryMgr.getCount());
    TEST_ASSERT_EQUAL_STRING("New", ClimbHistoryMgr.getCurrentClimb()->name);
    TEST_ASSERT_NULL(ClimbHistoryMgr.getClimb(1));
}

// =============================================================================
// Main
// =============================================================================

int main(int argc, char** argv) {
    UNITY_BEGIN();

    // Basic add/get tests
    RUN_TEST(test_addClimb_and_getCurrentClimb);
    RUN_TEST(test_hasCurrentClimb_false_when_empty);
    RUN_TEST(test_hasCurrentClimb_true_after_add);
    RUN_TEST(test_getCurrentClimb_null_when_empty);
    RUN_TEST(test_getCount_returns_zero_when_empty);
    RUN_TEST(test_getCount_increments_with_adds);
    RUN_TEST(test_addClimb_sets_valid_flag);

    // History shifting tests
    RUN_TEST(test_history_shifts_down_when_new_climb_added);
    RUN_TEST(test_history_maintains_order);
    RUN_TEST(test_history_preserves_grades_during_shift);
    RUN_TEST(test_history_preserves_uuids_during_shift);
    RUN_TEST(test_history_limits_to_max);
    RUN_TEST(test_oldest_entry_discarded_on_overflow);
    RUN_TEST(test_fill_exactly_to_max);

    // Update existing climb tests
    RUN_TEST(test_same_uuid_updates_instead_of_shifts);
    RUN_TEST(test_update_only_applies_to_current);
    RUN_TEST(test_update_preserves_uuid);
    RUN_TEST(test_update_with_null_grade_preserves_old_grade);
    RUN_TEST(test_multiple_updates_same_uuid);

    // Clear current tests
    RUN_TEST(test_clearCurrent_marks_no_current);
    RUN_TEST(test_clearCurrent_keeps_history);
    RUN_TEST(test_getCurrentClimb_null_after_clearCurrent);
    RUN_TEST(test_clearCurrent_when_empty_does_not_crash);
    RUN_TEST(test_addClimb_after_clearCurrent_becomes_new_current);
    RUN_TEST(test_clearCurrent_then_update_same_uuid);

    // Get climb by index tests
    RUN_TEST(test_getClimb_returns_null_for_negative_index);
    RUN_TEST(test_getClimb_returns_null_for_out_of_bounds_index);
    RUN_TEST(test_getClimb_returns_null_for_empty_slot);
    RUN_TEST(test_getClimb_returns_null_for_large_negative_index);
    RUN_TEST(test_getClimb_returns_null_for_large_positive_index);
    RUN_TEST(test_getClimb_index_0_same_as_getCurrentClimb);

    // Edge cases
    RUN_TEST(test_addClimb_with_null_name_is_ignored);
    RUN_TEST(test_addClimb_with_null_uuid_is_ignored);
    RUN_TEST(test_addClimb_with_null_grade_is_ok);
    RUN_TEST(test_addClimb_truncates_long_name);
    RUN_TEST(test_addClimb_truncates_long_grade);
    RUN_TEST(test_addClimb_truncates_long_uuid);
    RUN_TEST(test_addClimb_with_empty_strings);
    RUN_TEST(test_clear_removes_all_history);
    RUN_TEST(test_clear_when_already_empty);
    RUN_TEST(test_climb_entry_default_constructor);
    RUN_TEST(test_rapid_add_clear_cycles);
    RUN_TEST(test_add_after_clear_starts_fresh);

    return UNITY_END();
}
