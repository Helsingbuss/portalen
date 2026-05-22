import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
} from "lucide-react-native";

import { colors } from "../../theme/colors";
import { HELP_CATEGORIES, type HelpCategory } from "../../data/helpDocuments";

export default function DocumentsHelpScreen({ mode }: { mode: "admin" | "agent" }) {
  const [query, setQuery] = useState("");
  const [openCategoryId, setOpenCategoryId] = useState<string | null>("agent-customer");

  const filteredCategories = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) return HELP_CATEGORIES;

    return HELP_CATEGORIES.map((category) => {
      const documents = category.documents.filter((document) => {
        return (
          document.title.toLowerCase().includes(search) ||
          document.text.toLowerCase().includes(search) ||
          document.priority.toLowerCase().includes(search)
        );
      });

      const categoryMatch =
        category.title.toLowerCase().includes(search) ||
        category.description.toLowerCase().includes(search);

      if (categoryMatch) return category;

      return {
        ...category,
        documents,
      };
    }).filter((category) => category.documents.length > 0);
  }, [query]);

  function toggleCategory(category: HelpCategory) {
    setOpenCategoryId((current) => (current === category.id ? null : category.id));
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <BookOpenCheck size={38} color={colors.goldSoft} strokeWidth={2.4} />
          <Text style={styles.heroKicker}>
            {mode === "agent" ? "AGENTAPPEN" : "ADMINAPPEN"}
          </Text>
          <Text style={styles.heroTitle}>Dokument & Hjälp</Text>
          <Text style={styles.heroText}>
            Här hittar du manualer, interna instruktioner, regler, mallar och stödmaterial för arbetet inom Helsingbuss och Sundra.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Search size={19} color={colors.textMuted} strokeWidth={2.5} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Sök dokument, mallar eller guider..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Intern handbok</Text>
          <Text style={styles.infoText}>
            Materialet ska vara tydligt, tryggt och lätt att följa. Det ska hjälpa nya och befintliga användare att arbeta korrekt i appen.
          </Text>
        </View>

        {filteredCategories.map((category) => {
          const isOpen = openCategoryId === category.id;

          return (
            <View key={category.id} style={styles.categoryCard}>
              <Pressable style={styles.categoryHeader} onPress={() => toggleCategory(category)}>
                <View style={styles.categoryIcon}>
                  <FileText size={22} color={colors.primary} strokeWidth={2.5} />
                </View>

                <View style={styles.categoryTextBox}>
                  <Text style={styles.categoryTitle}>{category.title}</Text>
                  <Text style={styles.categoryText}>{category.description}</Text>
                </View>

                {isOpen ? (
                  <ChevronUp size={22} color={colors.primary} strokeWidth={2.5} />
                ) : (
                  <ChevronDown size={22} color={colors.primary} strokeWidth={2.5} />
                )}
              </Pressable>

              {isOpen ? (
                <View style={styles.documentList}>
                  {category.documents.map((document) => (
                    <View key={document.id} style={styles.documentCard}>
                      <View style={styles.priorityPill}>
                        <Text style={styles.priorityText}>{document.priority}</Text>
                      </View>

                      <Text style={styles.documentTitle}>{document.title}</Text>
                      <Text style={styles.documentText}>{document.text}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {filteredCategories.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Inget hittades</Text>
            <Text style={styles.emptyText}>Testa att söka på offert, bokning, Sundra, rabatt eller mall.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 120 },

  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
  },
  heroKicker: {
    color: colors.goldSoft,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 5,
  },
  heroTitle: { color: colors.white, fontSize: 27, fontWeight: "900" },
  heroText: {
    color: "#DDEBE8",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
  },

  searchBox: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 9,
  },

  infoCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  infoTitle: { color: colors.primary, fontSize: 15, fontWeight: "900" },
  infoText: {
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
  },

  categoryCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: "hidden",
  },
  categoryHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryTextBox: { flex: 1 },
  categoryTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  categoryText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },

  documentList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  documentCard: {
    backgroundColor: colors.background,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginTop: 9,
  },
  priorityPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 8,
  },
  priorityText: { color: colors.primary, fontSize: 10.5, fontWeight: "900" },
  documentTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  documentText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
});
