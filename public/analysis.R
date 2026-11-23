# ==============================================================================
# 로컬스페이스 (LocalSpace) - 제안서 증빙 및 통계 그래프 재현용 R 스크립트
# 출품: 제1회 동양AI빅데이터융합 아이디어 공모전 (AI빅데이터분야 / 팀명: 호날두의 아이들)
# 데이터 출처:
#   1) 상권 통계: 소상공인시장진흥공단 상가(상권)정보 CSV 구조 (반경 300m/500m 기준)
#   2) 거주 인구: 행정안전부 주민등록인구·연령별 인구 자료 구조 (행정동 단위 기준)
#   3) 실매물 조건: 사용자 입력·임장 메모 기반 정제 시나리오(data.csv)
# 주의(가드레일):
#   - 예상 매출액/성공률 예측 및 임의 총점 랭킹을 배제하고 정량 지표 격차만 시각화함
#   - 거주 배후인구와 실제 유동인구, 반경 기준과 행정동 기준의 차이를 주석에 명시함
# ==============================================================================

suppressPackageStartupMessages({
  library(readr)
  library(dplyr)
  library(tidyr)
  library(ggplot2)
  library(scales)
})

# 1. 정제 데이터 로드
df <- read_csv("data.csv", show_col_types = FALSE)

cat("=== [로컬스페이스] 시나리오별 정량 비교 요약 ===\n")
df %>%
  select(
    preset_name, candidate_slot, candidate_name, business_type,
    monthly_fixed_cost_manwon, area_pyeong, cost_per_pyeong_manwon,
    total_stores_in_radius, same_industry_density_pct
  ) %>%
  print(n = Inf)

# 공통 테마 (제안서 삽입용 클린 화이트 & 슬레이트)
theme_localspace <- theme_minimal(base_size = 11) +
  theme(
    plot.background = element_rect(fill = "white", color = NA),
    panel.background = element_rect(fill = "white", color = NA),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_blank(),
    plot.title = element_text(face = "bold", size = 13, color = "#0F172A"),
    plot.subtitle = element_text(size = 9.5, color = "#475569", margin = margin(b = 10)),
    plot.caption = element_text(size = 8, color = "#64748B", hjust = 0),
    legend.position = "top",
    strip.text = element_text(face = "bold", color = "#1E293B")
  )

# 2. 그래프 1: 프리셋 2(구도심 빈점포 vs 신도심 상가) 반경 300m 업종 분포 비교
p2_dist <- df %>%
  filter(preset_id == "preset2") %>%
  select(candidate_slot, candidate_name, cafe_cnt, food_cnt, retail_cnt, service_cnt, edu_cnt, med_cnt) %>%
  pivot_longer(
    cols = ends_with("_cnt"),
    names_to = "category",
    values_to = "store_count"
  ) %>%
  mutate(
    category = recode(
      category,
      cafe_cnt = "카페",
      food_cnt = "소형 음식점",
      retail_cnt = "소매점",
      service_cnt = "생활서비스",
      edu_cnt = "교육·학원",
      med_cnt = "의료·건강"
    ),
    label = paste0("후보 ", candidate_slot, ": ", candidate_name)
  )

g1 <- ggplot(p2_dist, aes(x = category, y = store_count, fill = candidate_slot)) +
  geom_col(position = position_dodge(width = 0.72), width = 0.64) +
  geom_text(
    aes(label = store_count),
    position = position_dodge(width = 0.72),
    vjust = -0.4,
    size = 3.2,
    color = "#334155"
  ) +
  scale_fill_manual(
    values = c("A" = "#2563EB", "B" = "#059669"),
    labels = c("A" = "후보 A (영주1동 구도심 빈점포)", "B" = "후보 B (가흥2동 신도심 상가)"),
    name = NULL
  ) +
  labs(
    title = "후보 A vs 후보 B 반경 300m 업종 분포 비교",
    subtitle = "지방 중소도시 빈점포 활성화 시나리오 (소상공인시장진흥공단 상가정보 구조 기준)",
    x = "업종 분류",
    y = "반경 300m 내 점포 수 (개)",
    caption = "출처: 소상공인시장진흥공단 상가(상권)정보 샘플 구조(기준시점 2026-06) | 상권=반경 기준, 인구=행정구역 단위 기준"
  ) +
  theme_localspace

ggsave("chart1_industry_distribution_300dpi.png", g1, width = 8.5, height = 4.8, dpi = 300)

# 3. 그래프 2: 전체 시나리오 평당 월 고정비 · 전용면적 · 동종 업종 밀집도 정량 비교
metrics_long <- df %>%
  mutate(slot_label = paste0(preset_id, " - 후보 ", candidate_slot)) %>%
  select(
    preset_name, candidate_slot,
    cost_per_pyeong_manwon, area_pyeong, same_industry_density_pct
  ) %>%
  pivot_longer(
    cols = c(cost_per_pyeong_manwon, area_pyeong, same_industry_density_pct),
    names_to = "metric",
    values_to = "value"
  ) %>%
  mutate(
    metric = factor(
      metric,
      levels = c("cost_per_pyeong_manwon", "area_pyeong", "same_industry_density_pct"),
      labels = c("평당 월 고정비 (만원/평)", "전용면적 (평)", "반경 300m 동종 밀집도 (%)")
    )
  )

g2 <- ggplot(metrics_long, aes(x = preset_name, y = value, fill = candidate_slot)) +
  geom_col(position = position_dodge(width = 0.7), width = 0.6) +
  facet_wrap(~metric, scales = "free_y", ncol = 3) +
  scale_fill_manual(
    values = c("A" = "#2563EB", "B" = "#059669"),
    labels = c("A" = "후보 A", "B" = "후보 B"),
    name = NULL
  ) +
  labs(
    title = "시나리오별 후보 A vs 후보 B 핵심 정량 지표 비교",
    subtitle = "임의 총점·매출 예측 대신 평당 고정비, 전용면적, 동종 업종 밀집도를 병렬 검증",
    x = NULL,
    y = "지표 값",
    caption = "주의: 프리셋 3은 비교 업종이 상이(카페 vs 소형 음식점)하므로 단순 점포 수 비교를 지양하고 조건별 분리 검토 필요"
  ) +
  theme_localspace +
  theme(axis.text.x = element_text(angle = 18, hjust = 1, size = 8.5))

ggsave("chart2_quantitative_comparison_300dpi.png", g2, width = 10.5, height = 4.8, dpi = 300)

cat("완료: chart1_industry_distribution_300dpi.png, chart2_quantitative_comparison_300dpi.png 생성됨\n")
