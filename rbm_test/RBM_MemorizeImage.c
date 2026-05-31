#define _USE_MATH_DEFINES

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#include "SFMT.h"
#include "SFMT.c"

#ifndef M_PI   // M_PIが定義されていない場合の定義
#define M_PI 3.14159265358979323846
#endif

#define NUM_VISIBLE (128 * 128)   // 可視層のニューロンの数
#define NUM_HIDDEN 8000           // 隠れ層のニューロンの数
#define NUM_SAMPLE 8              // 学習データの数
#define MAX_EPOCHS 10000          // 最大エポック数
#define CD_K 1                    // CD法のステップ数
#define LEARNING_RATE 0.001       // 学習率
#define IMAGE_DATA_PATH "image/image_data.txt"   // 学習（画像）データのパス
#define WEIGHT_FILE_PATH "weights.bin"   // 重みとバイアスのファイルのパス

sfmt_t sfmt;           // メルセンヌツイスター乱数生成器
int seed = 10;         // 乱数生成の初期シード値
float* net;            // 可視層と隠れ層間の重み行列
float* visible_bias;   // 可視層の各ニューロンのバイアス
float* hidden_bias;    // 隠れ層の各ニューロンのバイアス

/* ネットワークの重みとバイアスを初期化する関数 */
void initNet(void)
{
  size_t i, j;

  printf("---ネットワークを初期化---\n");
  // 重みの初期化：平均0、標準偏差0.01の正規分布からサンプリング
  // Box-Mullerアルゴリズムを使用して正規分布乱数を生成
  for (i = 0; i < NUM_VISIBLE; i++){
    for (j = 0; j < NUM_HIDDEN; j++){
      *(net + j + i * NUM_HIDDEN) = 
        sqrt(-2.0 * log(sfmt_genrand_real2(&sfmt))) * 
        sin(2.0 * M_PI * sfmt_genrand_real2(&sfmt)) * 0.01;
    }
  }
  // バイアスをすべて0で初期化
  for (i = 0; i < NUM_VISIBLE; i++){
    *(visible_bias + i) = 0.0;
  }
  for (i = 0; i < NUM_HIDDEN; i++){
    *(hidden_bias + i) = 0.0;
  }
}

/* シグモイド活性化関数 */
float sigmoid(float x)
{
  // シグモイド関数：入力を0～1の確率値に変換する活性化関数
  return 1.0 / (1.0 + expf(-x));
}

/* 確率値に基づいて2値をサンプリングする関数 */
int sampling(float prob)
{
  // 確率値に基づいて2値（0か1）をサンプリングする
  // probより小さい乱数が出れば1を、そうでなければ0を返す
  return (sfmt_genrand_real2(&sfmt) < prob) ? 1 : 0;
}

/* 可視層の状態から隠れ層の発火確率を計算する関数 */
void getHiddenProb(short int* visible, float* hidden_prob) {
  // 可視層の状態から隠れ層のニューロンの発火確率を計算
  for (size_t j = 0; j < NUM_HIDDEN; j++) {
    float sum = 0;
    // 可視層の各ニューロンと重みの積の総和を計算
    for (size_t i = 0; i < NUM_VISIBLE; i++) {
      sum += visible[i] * *(net + j + i * NUM_HIDDEN);
    }
    // シグモイド関数を適用して発火確率に変換
    hidden_prob[j] = sigmoid(sum + hidden_bias[j]);
  }
}

/* 隠れ層の状態から可視層の発火確率を計算する関数 */
void getVisibleProb(short int* hidden, float* visible_prob) {
  // 隠れ層の状態から可視層のニューロンの発火確率を計算
  for (size_t i = 0; i < NUM_VISIBLE; i++) {
    float sum = 0;
    // 隠れ層の各ニューロンと重みの積の総和を計算
    for (size_t j = 0; j < NUM_HIDDEN; j++) {
      sum += hidden[j] * *(net + j + i * NUM_HIDDEN);
    }
    // シグモイド関数を適用して発火確率に変換
    visible_prob[i] = sigmoid(sum + visible_bias[i]);
  }
}

/* CD法によるRBMの学習を行う関数 */
void train(short int* data, int max_epochs, int cd_k, float learning_rate) {
  // CD法の学習アルゴリズム用の一時変数を確保
  float* hidden_pos_prob = (float*)malloc(NUM_HIDDEN * sizeof(float));
  float* visible_neg_prob = (float*)malloc(NUM_VISIBLE * sizeof(float));
  float* hidden_neg_prob = (float*)malloc(NUM_HIDDEN * sizeof(float));
  short int* hidden_sample = 
    (short int*)malloc(NUM_HIDDEN * sizeof(short int));
  short int* visible_sample = 
    (short int*)malloc(NUM_VISIBLE * sizeof(short int));

  printf("---ネットワークを学習---\n");
  for (int epoch = 0; epoch < max_epochs; epoch++) {
    // 再構築エラーを計算するための変数
    float error = 0.0;
    // エラーを計算するかどうかのフラグ
    int calculate_error_flag = (epoch % 10 == 0);
    for (int sample = 0; sample < NUM_SAMPLE; sample++) {
      // 学習データのサンプルを取得
      short int* data_sample = data + sample * NUM_VISIBLE;
      // （A）現実フェーズ - 実データから隠れ層の確率を計算
      getHiddenProb(data_sample, hidden_pos_prob);
      // 確率に基づいて隠れ層の状態をサンプリング
      for (int j = 0; j < NUM_HIDDEN; j++) {
        hidden_sample[j] = sampling(hidden_pos_prob[j]);
      }
      // （B）夢フェーズ - モデルからのサンプリングを行う
      for (int k = 0; k < cd_k; k++) {
        // 隠れ層から可視層を再構築
        getVisibleProb(hidden_sample, visible_neg_prob);
        for (int i = 0; i < NUM_VISIBLE; i++) {
          visible_sample[i] = sampling(visible_neg_prob[i]);
        }
        // 再構築した可視層から隠れ層を計算
        getHiddenProb(visible_sample, hidden_neg_prob);
        for (int j = 0; j < NUM_HIDDEN; j++) {
          hidden_sample[j] = sampling(hidden_neg_prob[j]);
        }
      }
      // （C）比較と更新
      for (size_t i = 0; i < NUM_VISIBLE; i++) {
        // 重みの更新： W += η(⟨v_i h_j⟩_data - ⟨v_i h_j⟩_model)
        for (int j = 0; j < NUM_HIDDEN; j++) {
            *(net + j + i * NUM_HIDDEN) += 
              learning_rate * ((data_sample[i] * hidden_pos_prob[j]) - 
              (visible_sample[i] * hidden_neg_prob[j]));
        }
        // 可視層のバイアスの更新： a_i += η(⟨v_i⟩_data - ⟨v_i⟩_model)
        visible_bias[i] += learning_rate * (data_sample[i] - 
          visible_sample[i]);
      }
      for (int j = 0; j < NUM_HIDDEN; j++) {
        // 隠れ層のバイアスの更新： b_j += η(⟨h_j⟩_data - ⟨h_j⟩_model)
        hidden_bias[j] += learning_rate * ((hidden_pos_prob[j]) - 
          (hidden_neg_prob[j]));
      }
      // 再構築エラーの計算
      if (calculate_error_flag) {
        // 可視層の再構築エラーを計算
        for (int i = 0; i < NUM_VISIBLE; i++) {
          error += pow(data_sample[i] - visible_sample[i], 2);
        }
      }
    }
    // 定期的に再構築エラーを計算して学習進捗を表示
    if (calculate_error_flag) {
      // エラーを正規化して表示（サンプルと可視ニューロンの数で割る）
      float normalized_error = error / NUM_SAMPLE / NUM_VISIBLE;
      printf("Epoch %d, Error: %f\n", epoch, normalized_error);
      // エラーが十分小さくなったら早期終了
      if (normalized_error < 0.01) {
        printf("Training converged.\n");
        break;
      }
    }
  }
  // 確保したメモリーを解放
  free(hidden_pos_prob);
  free(visible_neg_prob);
  free(hidden_neg_prob);
  free(hidden_sample);
  free(visible_sample);
}

/* 学習済みのネットワークのパラメータをバイナリファイルに保存する関数 */
void writeNet(char* file_name)
{
  FILE* fp;

  printf("---ネットワークの重みとバイアスを出力---\n");
  if ((fp = fopen(file_name, "wb")) == NULL){
    printf("ファイルオープンに失敗\n");
    exit(1);
  }
  // 学習した重みをバイナリファイルに保存
  fwrite(net, sizeof(float), (size_t)NUM_VISIBLE * NUM_HIDDEN, fp);
  // 学習したバイアスをバイナリファイルに保存
  fwrite(visible_bias, sizeof(float), NUM_VISIBLE, fp);
  fwrite(hidden_bias, sizeof(float), NUM_HIDDEN, fp);
  fclose(fp);
}

/* 学習データをテキストファイルから読み込む関数 */
void readData(short int* data, char* image_data_path)
{
  FILE* fp;
  char line[NUM_VISIBLE + 1];
  int sample_idx, pixel_idx;

  printf("---学習データを読み込む---\n");
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
        printf("学習データの読み込みに失敗。");
        exit(1);
      }
    }
  }
  fclose(fp);
}

/* プログラムのエントリーポイント */
int main(void)
{
  short int *learning_data;

  // 必要なメモリーの動的確保
  learning_data = 
    (short int *)malloc(NUM_SAMPLE * NUM_VISIBLE * sizeof(short int));
  net = (float *)malloc((size_t)NUM_VISIBLE * NUM_HIDDEN * sizeof(float));
  visible_bias = (float *)malloc((size_t)NUM_VISIBLE * sizeof(float));
  hidden_bias = (float *)malloc((size_t)NUM_HIDDEN * sizeof(float));
  if (learning_data == NULL || net == NULL || 
      visible_bias == NULL || hidden_bias == NULL) {
    fprintf(stderr, "メモリーの確保に失敗しました。\n");
    return (1);
  }

  sfmt_init_gen_rand(&sfmt, seed);            // 乱数シードを設定
  initNet();                                  // ネットワークを初期化
  readData(learning_data, IMAGE_DATA_PATH);   // 学習データを読み込む
  train(learning_data, MAX_EPOCHS, CD_K, LEARNING_RATE);   // 学習
  writeNet(WEIGHT_FILE_PATH);   // ネットワークの重みとバイアスを出力
  // 確保したメモリーを解放
  free(learning_data);
  free(net);
  free(visible_bias);
  free(hidden_bias);
  return (0);
}