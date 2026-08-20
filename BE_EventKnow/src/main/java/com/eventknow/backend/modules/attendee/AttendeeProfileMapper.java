package com.eventknow.backend.modules.attendee;

import com.eventknow.backend.model.entity.Core.EventAttendanceEntity;
import com.eventknow.backend.model.entity.Core.AttendeeProfileEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class AttendeeProfileMapper {

    private static final String[] TITLE_KEYS = { "chuc_vu", "chuc vu", "position", "title", "vi_tri", "vai_tro" };
    private static final String[] COMPANY_KEYS = { "don_vi", "ten_don_vi", "cong_ty", "ten_cong_ty", "company",
            "organization", "to_chuc" };

    public static String buildRoleInEvent(String title, String company) {
        boolean hasTitle = title != null && !title.isBlank();
        boolean hasCompany = company != null && !company.isBlank();

        if (hasTitle && hasCompany) {
            return title.trim() + " - " + company.trim();
        } else if (hasTitle) {
            return title.trim();
        } else if (hasCompany) {
            return company.trim();
        }
        return "";
    }

    public static String getTitleAtEvent(EventAttendanceEntity att) {
        Map<String, Object> snap = att.getSnapshotData();
        if (snap != null) {
            if (snap.containsKey("title_at_event") && snap.get("title_at_event") != null
                    && !String.valueOf(snap.get("title_at_event")).trim().isEmpty()) {
                return String.valueOf(snap.get("title_at_event")).trim();
            }
            if (snap.containsKey("position_at_event") && snap.get("position_at_event") != null
                    && !String.valueOf(snap.get("position_at_event")).trim().isEmpty()) {
                return String.valueOf(snap.get("position_at_event")).trim();
            }
            for (String key : snap.keySet()) {
                String normalizedKey = normalizeKey(key);
                if (isMatch(normalizedKey, TITLE_KEYS)) {
                    Object val = snap.get(key);
                    if (val != null && !String.valueOf(val).trim().isEmpty()) {
                        return String.valueOf(val).trim();
                    }
                }
            }
        }
        return att.getAttendeeProfile() != null && att.getAttendeeProfile().getPosition() != null
                ? att.getAttendeeProfile().getPosition()
                : "";
    }

    public static String getCompanyAtEvent(EventAttendanceEntity att) {
        if (att.getOrganization() != null) {
            return att.getOrganization().getOrgName();
        }
        Map<String, Object> snap = att.getSnapshotData();
        if (snap != null) {
            if (snap.containsKey("company_at_event") && snap.get("company_at_event") != null
                    && !String.valueOf(snap.get("company_at_event")).trim().isEmpty()) {
                return String.valueOf(snap.get("company_at_event")).trim();
            }
            for (String key : snap.keySet()) {
                String normalizedKey = normalizeKey(key);
                if (isMatch(normalizedKey, COMPANY_KEYS)) {
                    Object val = snap.get(key);
                    if (val != null && !String.valueOf(val).trim().isEmpty()) {
                        return String.valueOf(val).trim();
                    }
                }
            }
        }
        if (att.getAttendeeProfile() != null) {
            return att.getAttendeeProfile().getOrganization() != null
                    ? att.getAttendeeProfile().getOrganization().getOrgName()
                    : (att.getAttendeeProfile().getOrganizationTextRaw() != null
                            ? att.getAttendeeProfile().getOrganizationTextRaw()
                            : "");
        }
        return "";
    }

    public static EventAttendanceEntity findLatestAttendance(List<EventAttendanceEntity> attendances) {
        if (attendances == null || attendances.isEmpty()) {
            return null;
        }
        return attendances.stream()
                .max((att1, att2) -> {
                    LocalDate d1 = att1.getRawEvent() != null ? att1.getRawEvent().getEventDate() : null;
                    LocalDate d2 = att2.getRawEvent() != null ? att2.getRawEvent().getEventDate() : null;
                    if (d1 == null)
                        d1 = LocalDate.MIN;
                    if (d2 == null)
                        d2 = LocalDate.MIN;
                    int cmp = d1.compareTo(d2);
                    if (cmp != 0)
                        return cmp;

                    java.time.LocalDateTime t1 = att1.getCreatedAt();
                    java.time.LocalDateTime t2 = att2.getCreatedAt();
                    if (t1 == null)
                        t1 = java.time.LocalDateTime.MIN;
                    if (t2 == null)
                        t2 = java.time.LocalDateTime.MIN;
                    cmp = t1.compareTo(t2);
                    if (cmp != 0)
                        return cmp;

                    UUID id1 = att1.getId();
                    UUID id2 = att2.getId();
                    if (id1 == null && id2 == null)
                        return 0;
                    if (id1 == null)
                        return -1;
                    if (id2 == null)
                        return 1;
                    return id1.compareTo(id2);
                })
                .orElse(null);
    }

    private static String normalizeKey(String key) {
        if (key == null)
            return "";
        String temp = java.text.Normalizer.normalize(key, java.text.Normalizer.Form.NFD);
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String removed = pattern.matcher(temp).replaceAll("")
                .toLowerCase()
                .replace("đ", "d")
                .replace("Đ", "d");
        return removed.trim();
    }

    private static boolean isMatch(String normalizedKey, String[] targetKeys) {
        String cleanKey = normalizedKey.replace("_", " ").replaceAll("\\s+", " ").trim();
        for (String target : targetKeys) {
            String cleanTarget = target.replace("_", " ").replaceAll("\\s+", " ").trim();
            if (cleanKey.equalsIgnoreCase(cleanTarget) || cleanKey.contains(cleanTarget)) {
                return true;
            }
        }
        return false;
    }
}
