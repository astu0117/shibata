#define _USE_MATH_DEFINES

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "SFMT.h"
#include "SFMT.c"

#define NUM_VISIBLE (128 * 128)          // 可視層のニューロンの数
#define NUM_HIDDEN 8000                  // 隠れ層のニューロンの数
#define NUM_SAMPLE 8                     // 入力データの数
#define WEIGHT_FILE_PATH "weights.bin"   // 重みとバイアスのファイルのパス
#define IMAGE_DATA_PATH "missing_image/image_data.txt"   // 入力データのパス
#define RESULT_FILE_PATH "result_data.txt"   // 結果ファイルのパス

sfmt_t sfmt;           // メルセンヌツイスター乱数生成器
int seed = 10;         // 乱数生成の初期シード値
float* net;            // 可視層と隠れ層間の重み行列
float* visible_bias;   // 可視層の各ニューロンのバイアス
float* hidden_bias;    // 隠れ層の各ニューロンのバイアス

/* シグモイド活性化関数 */
float sigmoid(float x)
{
  return 1.0 / (1.0 + expf(-x));
}

/* 確率値に基づいて2値をサンプリングする関数 */
int sampling(float prob)
{
  return (sfmt_genrand_real2(&sfmt) < prob) ? 1 : 0;
}

/* 可視層の状態から隠れ層の発火確率を計算する関数 */
void getHiddenProb(short int* visible, float* hidden_prob) {
  for (size_t j = 0; j < NUM_HIDDEN; j++) {
    float sum = 0;
    for (size_t i = 0; i < NUM_VISIBLE; i++) {
      sum += visible[i] * *(net + j + i * NUM_HIDDEN);
    }
    hidden_prob[j] = sigmoid(sum + hidden_bias[j]);
  }
}

/* 隠れ層の状態から可視層の発火確率を計算する関数 */
void getVisibleProb(short int* hidden, float* visible_prob) {
  for (size_t i = 0; i < NUM_VISIBLE; i++) {
    float sum = 0;
    for (size_t j = 0; j < NUM_HIDDEN; j++) {
      sum += hidden[j] * *(net + j + i * NUM_HIDDEN);
    }
    visible_prob[i] = sigmoid(sum + visible_bias[i]);
  }
}

/* 入力データから特徴を抽出し、再構築する関数 */
void rememberImage(short int* data)
{
  float* hidden_prob = (float*)malloc(NUM_HIDDEN * sizeof(float));
  float* visible_prob = (float*)malloc(NUM_VISIBLE * sizeof(float));
  short int* hidden_sample = 
    (short int*)malloc(NUM_HIDDEN * sizeof(short int));

  // ステップ1：入力データの特徴抽出（入力層→隠れ層）
  getHiddenProb(data, hidden_prob);
  for (int j = 0; j < NUM_HIDDEN; j++) {
    hidden_sample[j] = sampling(hidden_prob[j]);
  }
  // ステップ2：特徴からのデータ再構築（隠れ層→入力層）
  getVisibleProb(hidden_sample, visible_prob);
  for (int i = 0; i < NUM_VISIBLE; i++) {
    data[i] = sampling(visible_prob[i]);
  }
}

/* 学習済みネットワークの重みとバイアスをバイナリファイルから読み込む関数 */
void readNet(char* file_name)
{
  FILE* fp;

  printf("---ネットワークを読み込む---\n");
  if ((fp = fopen(file_name, "rb")) == NULL){
    printf("ファイルオープンに失敗\n");
    exit(1);
  }
  // 重みをバイナリファイルから読み込む
  fread(net, sizeof(float), (size_t)NUM_VISIBLE * NUM_HIDDEN, fp);
  // バイアスをバイナリファイルから読み込む
  fread(visible_bias, sizeof(float), NUM_VISIBLE, fp);
  fread(hidden_bias, sizeof(float), NUM_HIDDEN, fp);
  fclose(fp);
}

/* 入力データをテキストファイルから読み込む関数 */
void readData(short int* data, char* image_data_path)
{
  FILE* fp;
  char line[NUM_VISIBLE + 1];
  int sample_idx, pixel_idx;

  printf("---入力データを読み込む---\n");
  if ((fp = fopen(image_data_path, "r")) == NULL){
    printf("ファイルオープンに失敗\n");
    exit(1);
  }
  // テキストファイルから各サンプルを1行ずつ読み込む
  for (sample_idx = 0; sample_idx < NUM_SAMPLE; sample_idx++){
    if (fscanf(fp, "%s\n", line) != 1){
      printf("データ読み込み中に予期せぬエラーが発生\n\n");
      exit(1);
    }
    // 入力データの長さをチェック
    if (strlen(line) != NUM_VISIBLE){
      printf("学習データの読み込みに失敗。入力の数が違う。");
      exit(1);
    }
    // テキスト形式（0/1）から2値形式に変換して保存
    for (pixel_idx = 0; pixel_idx < NUM_VISIBLE; pixel_idx++){
      if (line[pixel_idx] == '1'){
        *(data + pixel_idx + sample_idx * NUM_VISIBLE) = 1;
      }
      else if (line[pixel_idx] == '0'){
        *(data + pixel_idx + sample_idx * NUM_VISIBLE) = 0;
      }
      else {
        printf("入力データの読み込みに失敗。");
        exit(1);
      }
    }
  }
  fclose(fp);
}

/* 結果をテキストファイルに出力する関数 */
void writeData(short int* data, char* file_name)
{
  FILE* fp;

  printf("---結果を出力---\n");
  if ((fp = fopen(file_name, "w")) == NULL){
    printf("ファイルオープンに失敗\n");
    exit(1);
  }
  for (int sample = 0; sample < NUM_SAMPLE; sample++){
    for (int i = 0; i < NUM_VISIBLE; i++){
      if (*(data + i + sample * NUM_VISIBLE) == 1){
        fprintf(fp, "1");
      }
      else if (*(data + i + sample * NUM_VISIBLE) == 0){
        fprintf(fp, "0");
      }
    }
    fprintf(fp, "\n");
  }
  fclose(fp);
}

/* プログラムのエントリーポイント */
int main(void)
{
  short int* input_data;

  input_data = 
    (short int *)malloc(NUM_SAMPLE * NUM_VISIBLE * sizeof(short int));
  net = (float *)malloc((size_t)NUM_VISIBLE * NUM_HIDDEN * sizeof(float));
  visible_bias = (float *)malloc((size_t)NUM_VISIBLE * sizeof(float));
  hidden_bias = (float *)malloc((size_t)NUM_HIDDEN * sizeof(float));
  if (input_data == NULL || net == NULL || visible_bias == NULL || 
      hidden_bias == NULL) {
    fprintf(stderr, "メモリーの確保に失敗しました。\n");
    return (1);
  }
  sfmt_init_gen_rand(&sfmt, seed);
  readNet(WEIGHT_FILE_PATH);  // ネットワークを読み込み
  readData(input_data, IMAGE_DATA_PATH);   // 入力データを読み込む
  // 想起
  for (int sample = 0; sample < NUM_SAMPLE; sample++){
    printf("想起中...(%3d/%3d)\n", sample, NUM_SAMPLE);
    rememberImage(input_data + sample * NUM_VISIBLE);
  }
  writeData(input_data, RESULT_FILE_PATH);   // 結果を出力
  free(input_data);
  free(net);
  free(visible_bias);
  free(hidden_bias);
  return (0);
}
