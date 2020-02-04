#include "STM32L1xx.h"

#define SW1 GPIOA->IDR & 0x02
#define SW2 GPIOA->IDR & 0x04

uint8_t count = 0;
uint8_t count2 = 9;
int dir = 1
void EXTI0_IRQHandler(){
	EXTI_PR = 0x00FFFFFF;	
	dir = -1;
}
void EXTI1_IRQHandler(){
	EXTI_PR = 0x00FFFFFF;
	dir = 1;
}
void pinSetup() {
    RCC->APB1ENR |= 0x00000010;
    RCC->AHBENR  |= 0x05;
    GPIOA->MODER &= ~0x0000003C;
    GPIOC->MODER &= ~0x0000FFFF;
    GPIOC->MODER |=  0x00005555;
}
void count(uint8_t *count,int dir){
    *count += dir;
    if (*count == 255) {
        count = 9;
    }
    else if (*count == 10) {
        count = 0;
    }
}
void delay(){
    TIM6->SR = 0;	
    TIM6->PSC =  0xFFFF;
    TIM6->ARR = 30;
    TIM6->CNT = 0;
    TIM6->CR1 |= TIM_CR1_CEN;
    while (!(TIM6->SR & TIM_SR_UIF));
}
int main(void){
    pinSetup();
	SYSCFG_EXTICR1 = 0;
	EXTI_RTSR = 0x00FFFFFF;
	EXTI_EMR = 	0x00000003; 
	//NVIC_EnableIRQ(EXTI0_IRQn);
	//NVIC_EnableIRQ(EXTI1_IRQn);
    while(1) {
        if (SW1) {
            delay();
            count(&count,1);
            delay();
            count(&count,1);
            count(&count2,dir);
        }
        GPIOC->ODR = ((count2 & 0x0F) << 4) || (count & 0x0F);
    }
}
